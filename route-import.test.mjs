import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
if (scripts.length !== 1) throw new Error(`Esperado 1 script, encontrado ${scripts.length}`);

class FakeClassList {
  values = new Set();
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, force = !this.contains(value)) { if (force) this.add(value); else this.remove(value); return force; }
}

const nodes = new Map();
function node(selector) {
  if (!nodes.has(selector)) {
    nodes.set(selector, {
      value: "",
      textContent: "",
      innerHTML: "",
      required: false,
      checked: false,
      disabled: false,
      dataset: {},
      children: [],
      classList: new FakeClassList(),
      style: {},
      listeners: {},
      addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
      dispatchEvent(event) { event.target ||= this; for (const handler of this.listeners[event.type] || []) handler(event); },
      setAttribute() {},
      appendChild(child) { this.children.push(child); return child; },
      focus() {},
      reset() {},
      scrollIntoView() {},
      closest() { return null; },
    });
  }
  return nodes.get(selector);
}

const context = {
  console,
  Intl,
  Date,
  Math,
  JSON,
  Number,
  String,
  Object,
  Array,
  Set,
  Map,
  Error,
  crypto: crypto.webcrypto,
  setTimeout() { return 1; },
  clearTimeout() {},
  confirm() { return true; },
  localStorage: { getItem() { return JSON.stringify({date:'2026-10-14',loads:[{id:'startup-caruaru',route:'AG1 CARUARU',mode:'OWN',profile:'3/4',vehicleCount:3,weight:15208,km:157.47,deliveries:71,customerType:'RETAIL',group:'AGRESTE_1',target:.441}]}); }, setItem() {} },
  document: {
    modelContext: undefined,
    querySelector: selector=>selector==="#route-rows"?null:node(selector),
    querySelectorAll() { return []; },
    createElement() { return node("created"); },
  },
  window: { scrollTo() {}, print() {} },
  addEventListener() {},
};
context.globalThis = context;
node("#profile").value = "3/4";
node("#freight-mode").value = "OWN";
node("#customer-type").value = "RETAIL";
node("#target-group").value = "AGRESTE_2";
vm.createContext(context);
// A hosted page may contain older globals; the current app must use its own bindings.
vm.runInContext('const PROFILE_CONFIG={legacy:true};const fields={};function renderSummary(){throw new Error("Legacy summary used");}',context);
const expose=';globalThis.__test={calculateLoad,aggregate,parseDelimited,matrixToBulkRecords,recordToCalculated,parseDateValue,parseDistanceKm,readForm,readBulkGrid,bulkGridRow,prepareBulk,renderAll,restore,duplicateLoad,editLoad,drawExport,formatTon,duration,routeServiceMinutes,routeTimeCell,minimumViableWeightKg,additionalWeightNeededKg,minimumViableWeightCell,ROUTE_KM_AVERAGES,getRouteAverageKm,getLoads:()=>loads,setLoads:value=>{loads=value}};';
const runnable=scripts[0].replace('    /* Application startup. */',expose+'\n    /* Application startup. */');
assert.notEqual(runnable,scripts[0]);
vm.runInContext(runnable,context);
for(const name of ['renderSummary','renderQueue','drawExport']){
  assert.equal([...scripts[0].matchAll(new RegExp(`function ${name}\\(`,'g'))].length,1,`Gerador único: ${name}`);
}
function detailCells(){
  const headers=[...node('#detail-head').innerHTML.matchAll(/<th data-col="([^"]+)"/g)].map(m=>m[1]);
  const rows=[...node('#detail-rows').innerHTML.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(row=>[...row[1].matchAll(/<td data-col="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g)]);
  assert.equal(headers.length,15);
  for(const cells of rows){assert.deepEqual(cells.map(m=>m[1]),headers,'Títulos e células devem estar alinhados');}
  return rows.map(cells=>Object.fromEntries(cells.map(m=>[m[1],m[2]])));
}
// Reproduce the first line in the user's screenshot at actual app startup.
const startupCells=detailCells()[0];
assert.ok(startupCells['total-weight'].includes('15,208 Ton'));
assert.ok(startupCells['weight-per-car'].includes('5,06933 Ton'));
assert.ok(startupCells['minimum-weight'].includes('10,14807 Ton'));
assert.equal(startupCells.km,'157,47');
assert.ok(startupCells['service-time'].includes('35h30'));
assert.ok(startupCells['service-time'].includes('71 clientes'));

// New regional goals apply to manual entry, imports and old saved plans.
const regionalGoals=[
  ['AG1 CARUARU','AGRESTE_1',.270,.441],
  ['AG2 GARANHUNS','AGRESTE_2',.270,.441],
  ['SRT PETROLINA','SERTAO',.793,.945],
  ['CEARA','CE',.954,.7],
  ['PB CAMPINA GRANDE','PB',.555,.56],
  ['AL MACEIO','AL',.966,.91],
  ['AG2 PETROLANDIA','SERTAO',.793,.945],
];
assert.equal(context.__test.getLoads()[0].target,.270,'Recalcular a meta do planejamento antigo ao abrir');
assert.equal(startupCells.target,'0,270');
const legacyPlans=[];
for(const [route,group,expected,previous] of regionalGoals){
  node('#route').value=route;node('#route').dispatchEvent({type:'change'});
  assert.equal(node('#target-group').value,group,route);
  assert.equal(Number(node('#target').value),expected,route);
  const raw={route,profile:'3/4',weight:'1000',deliveries:'2',km:'100'};
  for(const target of [undefined,String(previous).replace('.',',')]){
    const load=context.__test.recordToCalculated({raw:{...raw,target}});
    assert.equal(load.target,expected,`Meta importada: ${route}`);
    assert.ok(Math.abs(load.viability-(expected-.58))<1e-10);
    const min=context.__test.minimumViableWeightKg(load);
    assert.ok(context.__test.calculateLoad({...load,weightInput:min}).viability>=0);
    const extra=context.__test.additionalWeightNeededKg(load);
    assert.ok(context.__test.calculateLoad({...load,weightInput:load.weight+extra}).viability>=0);
  }
  legacyPlans.push({id:route,route,group,mode:'OWN',profile:'3/4',weight:1000,km:100,deliveries:2,customerType:'RETAIL',target:previous});
}
const originalStoredPlans=context.localStorage.getItem;
context.localStorage.getItem=()=>JSON.stringify({loads:legacyPlans});
context.__test.restore();
assert.deepEqual(Array.from(context.__test.getLoads(),l=>l.target),regionalGoals.map(row=>row[2]));
context.__test.renderAll();
assert.deepEqual(detailCells().map(row=>row.target),['0,270','0,270','0,793','0,954','0,555','0,966','0,793']);
// Manual adjustments made in the current form survive calculation and restoration.
node('#target-group').value='AGRESTE_1';node('#target').value='.441';
const custom=context.__test.calculateLoad({...legacyPlans[0],...context.__test.readForm(),route:'AG1 CARUARU',mode:'OWN',profile:'3/4',vehicleCount:1,weight:1000,weightUnit:'KG',km:100,deliveries:2,customerType:'RETAIL'});
assert.equal(custom.target,.441);
context.localStorage.getItem=()=>JSON.stringify({loads:[custom]});context.__test.restore();
assert.equal(context.__test.getLoads()[0].target,.441);
context.localStorage.getItem=originalStoredPlans;
context.__test.restore();

const own = context.__test.calculateLoad({
  id: "a",
  oc: "1",
  plate: "ROC6G86",
  route: "AG1 CARUARU",
  mode: "OWN",
  profile: "3/4",
  weight: 2800,
  km: 118,
  deliveries: 16,
  customerType: "RETAIL",
  group: "AGRESTE_1",
  target: 0.270,
});
const truck = context.__test.calculateLoad({
  id: "b",
  oc: "2",
  plate: "PTN6H99",
  route: "AG1 CARUARU REDES",
  mode: "OWN",
  profile: "TRUCK",
  weight: 11842,
  km: 109,
  deliveries: 2,
  customerType: "NETWORK",
  group: "AGRESTE_1",
  target: 0.270,
});
const contracted = context.__test.calculateLoad({
  id: "c",
  oc: "3",
  plate: "ABC1D23",
  route: "SRT PETROLINA",
  mode: "CONTRACTED",
  profile: "CARRETA",
  weight: 25000,
  km: 1000,
  deliveries: 1,
  customerType: "NETWORK",
  group: "SERTAO",
  loadValue: 56000,
  freightValue: 14600,
});
const multiVehicle = context.__test.calculateLoad({
  id: "d",
  route: "AG1 CARUARU",
  mode: "OWN",
  profile: "3/4",
  vehicleCount: 2,
  weight: 9400,
  km: 121,
  deliveries: 18,
  customerType: "RETAIL",
  group: "AGRESTE_1",
  target: 0.270,
});
const tonRoute = context.__test.calculateLoad({
  id: "e",
  route: "AG1 CARUARU",
  mode: "OWN",
  profile: "3/4",
  vehicleCount: 2,
  weight: 9.4,
  weightUnit: "TON",
  km: 121,
  deliveries: 18,
  customerType: "RETAIL",
  group: "AGRESTE_1",
  target: 0.270,
});

if (Math.abs(own.cost - 684.4) > 0.001) throw new Error("Custo próprio incorreto");
if (Math.abs(own.viability - (0.270 - 684.4 / 2800)) > 0.000001) throw new Error("Viabilidade própria incorreta");
if ("plate" in own || "oc" in own) throw new Error("OC ou placa ainda fazem parte do planejamento");
if (truck.capacity !== 12000 || truck.excess !== 0) throw new Error("Capacidade do Truck incorreta");
if (contracted.financialBalance !== 41400) throw new Error("Saldo contratado incorreto");
if (multiVehicle.vehicleCount !== 2) throw new Error("Quantidade de carros incorreta");
if (multiVehicle.weightPerVehicle !== 4700) throw new Error("Divisão do peso por carro incorreta");
if (multiVehicle.capacity !== 10000 || multiVehicle.excess !== 0) throw new Error("Capacidade da frota incorreta");
if (multiVehicle.fleetKm !== 242) throw new Error("KM da frota incorreto");
if (Math.abs(multiVehicle.cost - 1403.6) > 0.001) throw new Error("Custo da frota incorreto");
if (Math.abs(multiVehicle.utilization - 0.94) > 0.000001) throw new Error("Utilização por carro incorreta");
if (multiVehicle.routeTimeMinutes !== 270) throw new Error("Tempo médio por carro incorreto");
if (tonRoute.weight !== 9400 || tonRoute.weightInput !== 9.4 || tonRoute.weightUnit !== "TON") throw new Error("Conversão de toneladas para kg incorreta");
if (tonRoute.weightPerVehicle !== 4700 || tonRoute.capacity !== 10000) throw new Error("Divisão da tonelada por carro incorreta");

// Total service time counts every client; the existing average per car stays separate.
assert.equal(context.__test.routeServiceMinutes(own),480);
assert.equal(context.__test.routeServiceMinutes(truck),360);
assert.equal(context.__test.routeServiceMinutes(multiVehicle),540);
assert.ok(context.__test.routeTimeCell(multiVehicle).includes('>9h00</strong>'));
assert.ok(context.__test.routeTimeCell(multiVehicle).includes('18 clientes'));
assert.ok(context.__test.routeTimeCell(multiVehicle).includes('Média por carro: 4h30'));
assert.equal(context.__test.duration(52*30),'26h00');
assert.equal(context.__test.duration(119.9),'2h00');

// The displayed minimum must reach viability; one cent of kg less must fall short.
assert.equal(context.__test.minimumViableWeightKg(own),2534.82);
assert.equal(context.__test.minimumViableWeightKg(multiVehicle),5198.52);
assert.equal(context.__test.minimumViableWeightKg(contracted),null);
for(const load of [own,truck,multiVehicle]){
  const minimum=context.__test.minimumViableWeightKg(load);
  const atMinimum=context.__test.calculateLoad({...load,weightInput:minimum,weightUnit:'KG'});
  const belowMinimum=context.__test.calculateLoad({...load,weightInput:minimum-.01,weightUnit:'KG'});
  assert.ok(atMinimum.viability>=-1e-12,'Peso mínimo deve atingir a meta');
  assert.ok(belowMinimum.viability<0,'Abaixo do peso mínimo não deve atingir a meta');
}
const overCapacityPlan=context.__test.calculateLoad({...own,weightInput:2000,km:1000});
assert.ok(context.__test.minimumViableWeightCell(overCapacityPlan).includes('Excede capacidade'));
assert.ok(!context.__test.minimumViableWeightCell(own).includes('Excede capacidade'));
assert.ok(context.__test.minimumViableWeightCell(contracted).includes('>—</span>'));

// Show the extra weight, accounting for the existing load and all cars in the plan.
const shortfallPlans=[
  [context.__test.calculateLoad({...own,weightInput:1000}),1534.82],
  [context.__test.calculateLoad({...own,weightInput:2434.82}),100],
  [context.__test.calculateLoad({...multiVehicle,weightInput:3000.005}),2198.52],
];
for(const [load,expected] of shortfallPlans){
  assert.equal(context.__test.additionalWeightNeededKg(load),expected);
  assert.ok(context.__test.minimumViableWeightCell(load).includes(`Faltam ${context.__test.formatTon(expected)}`));
  const toppedUp=context.__test.calculateLoad({...load,weightInput:load.weight+expected});
  assert.ok(toppedUp.viability>=0,'Adicionar o peso indicado deve tornar a rota viável');
}
const viableBelowRoundedMinimum=context.__test.calculateLoad({...own,weightInput:2534.819});
for(const load of [own,multiVehicle,viableBelowRoundedMinimum]){
  assert.equal(context.__test.additionalWeightNeededKg(load),0);
  assert.ok(!context.__test.minimumViableWeightCell(load).includes('Faltam'));
}
assert.equal(context.__test.additionalWeightNeededKg(contracted),null);
assert.ok(!context.__test.minimumViableWeightCell(contracted).includes('Faltam'));

let invalidVehicleCount = false;
try {
  context.__test.calculateLoad({ ...multiVehicle, vehicleCount: 1.5 });
} catch (error) {
  invalidVehicleCount = /número inteiro/.test(error.message);
}
if (!invalidVehicleCount) throw new Error("Quantidade fracionada de carros deveria ser recusada");

context.__test.setLoads([own, truck, contracted]);
const summary = context.__test.aggregate();
if (summary.vehicles !== 3 || summary.distinctRoutes !== 3) throw new Error("Contagem consolidada incorreta");
if (summary.totalCapacity !== 43000) throw new Error("Capacidade consolidada incorreta");
if (summary.over.length !== 0) throw new Error("Alerta de excesso incorreto");
if (summary.contractBalance !== 41400) throw new Error("Saldo consolidado incorreto");

context.__test.setLoads([multiVehicle]);
const fleetSummary = context.__test.aggregate();
if (fleetSummary.vehicles !== 2 || fleetSummary.routePlans !== 1) throw new Error("Rotas e veículos da frota incorretos");
if (fleetSummary.totalWeight !== 9400 || fleetSummary.totalCapacity !== 10000) throw new Error("Peso ou capacidade da frota incorretos");
if (fleetSummary.totalKm !== 242 || fleetSummary.totalDeliveries !== 18) throw new Error("KM ou entregas consolidados incorretos");
if (Math.abs(fleetSummary.totalCost - 1403.6) > 0.001) throw new Error("Custo consolidado da frota incorreto");
if (fleetSummary.green !== 2 || fleetSummary.yellow !== 0 || fleetSummary.red !== 0) throw new Error("Faixa de utilização da frota incorreta");

const pasted = context.__test.parseDelimited("OC;PLACA;ROTA;PERFIL;PESO;KM;ENTREGAS\n2521401;ROD6J69;AG1 CARUARU;3/4;3.565,00;123;20\n2521402;PDD7934;AG2 BELO JARDIM;TOCO;2.797,96;43;16");
const parsedBulk = context.__test.matrixToBulkRecords(pasted);
if (parsedBulk.records.length !== 2) throw new Error("Quantidade de linhas coladas incorreta");
const bulkOne = context.__test.recordToCalculated(parsedBulk.records[0]);
const bulkTwo = context.__test.recordToCalculated(parsedBulk.records[1]);
if (bulkOne.weight !== 3565 || bulkOne.profile !== "3/4") throw new Error("Conversão pt-BR da primeira carga incorreta");
if (bulkTwo.weight !== 2797.96 || bulkTwo.profile !== "TOCO") throw new Error("Conversão pt-BR da segunda carga incorreta");

const pastedWithCars = context.__test.parseDelimited("ROTA;PERFIL;CARROS;PESO TOTAL;KM;ENTREGAS\nAG1 CARUARU;3/4;2;9.400,00;121;18");
const parsedWithCars = context.__test.matrixToBulkRecords(pastedWithCars);
const importedFleet = context.__test.recordToCalculated(parsedWithCars.records[0]);
if (importedFleet.vehicleCount !== 2 || importedFleet.weight !== 9400 || importedFleet.weightPerVehicle !== 4700) {
  throw new Error("Importação com quantidade de carros incorreta");
}
if (bulkOne.vehicleCount !== 1) throw new Error("Importação sem CARROS deveria assumir um carro");

const pastedWithKg = context.__test.parseDelimited("ROTA;PERFIL;CARROS;PESO TOTAL (KG);KM;ENTREGAS\nAG1 CARUARU;3/4;2;9410;121;18");
const parsedWithKg = context.__test.matrixToBulkRecords(pastedWithKg);
const importedKg = context.__test.recordToCalculated(parsedWithKg.records[0]);
if (importedKg.weight !== 9410 || importedKg.weightUnit !== "KG" || importedKg.weightPerVehicle !== 4705) {
  throw new Error("Importação em KG incorreta");
}

// A unidade informada em arquivos antigos é ignorada: toda importação é KG.
const pastedWithLegacyUnit = context.__test.parseDelimited("ROTA;PERFIL;CARROS;PESO TOTAL;UNIDADE PESO;KM;ENTREGAS\nAG1 CARUARU;3/4;2;9410;TON;121;18");
const parsedWithLegacyUnit = context.__test.matrixToBulkRecords(pastedWithLegacyUnit);
const importedLegacyUnit = context.__test.recordToCalculated(parsedWithLegacyUnit.records[0]);
if (importedLegacyUnit.weight !== 9410 || importedLegacyUnit.weightUnit !== "KG") throw new Error("Importação não deve converter novamente um peso em KG");
const groupedKg = context.__test.recordToCalculated({raw:{route:"AG1 CARUARU",profile:"3/4",vehicleCount:"1",weight:"12.198",weightUnit:"TON",km:"121",deliveries:"18"}});
if (groupedKg.weight !== 12198 || groupedKg.weightUnit !== "KG") throw new Error("Valor 12.198 deveria ser reconhecido como 12.198 kg");
const decimalKg = context.__test.recordToCalculated({raw:{route:"AG1 CARUARU",profile:"3/4",vehicleCount:"1",weight:"9,41",weightUnit:"TON",km:"121",deliveries:"18"}});
if (decimalKg.weight !== 9.41 || decimalKg.weightUnit !== "KG") throw new Error("O peso colado deve ser interpretado sempre como KG");
const headerKg = context.__test.matrixToBulkRecords([
  ["ROTA","PERFIL","CARROS","PESO TOTAL (TON)","KM","ENTREGAS"],
  ["AG1 CARUARU","3/4","2","9410","121","18"],
]);
const ignoredHeaderUnit = context.__test.recordToCalculated(headerKg.records[0]);
if (ignoredHeaderUnit.weight !== 9410 || ignoredHeaderUnit.weightUnit !== "KG") throw new Error("Unidade no cabeçalho não deve alterar a leitura em KG");
if (html.includes('id="bulk-default-unit"')) throw new Error("Seletor de unidade em lote ainda está visível");
const gridMarkup = context.__test.bulkGridRow().innerHTML;
if (gridMarkup.includes('data-key="weightUnit"') || gridMarkup.includes("Unidade do peso")) throw new Error("Tabela em lote ainda permite escolher a unidade");

const dailyFormat = context.__test.matrixToBulkRecords([
  ["07/10/2026 | QUARTA-FEIRA"],
  ["SEQ","OC","PLACA","PERFIL","KM","ROTA","PESO","DIVISÓRIA","ENTREGAS"],
  ["1","2521301","ROC6G86","3/4","121","AG1 CARUARU","4.705,00","NÃO","18"],
  ["2","2521302","PTN6H99","TRUCK","500","SRT PETROLINA REDES","11.842,00","SIM","2"],
]);
if (dailyFormat.date !== "2026-10-07" || dailyFormat.records.length !== 2) throw new Error("Formato do resumo diário não foi reconhecido");
const importedTruck = context.__test.recordToCalculated(dailyFormat.records[1]);
if (importedTruck.capacity !== 12000 || importedTruck.customerType !== "NETWORK") throw new Error("Truck ou atendimento importado incorretamente");

// Regression: the KM column uses Brazilian thousands separators, independently of weight units.
const kmCases = [["1.064",1064],["1.000",1000],["2.500",2500],["12.345",12345],
  ["1.064,50",1064.5],["1.234.567",1234567],["130",130],["50",50],["320",320],
  ["1064",1064],["1.064 km",1064],["12,5",12.5],["12.5",12.5],[0,0],[1064,1064],[12.5,12.5]];
for (const [input, expected] of kmCases) {
  if (context.__test.parseDistanceKm(input) !== expected) throw new Error(`KM incorreto para ${input}`);
}
for (const input of ["", "   ", "abc", "1..064", "1,064,00", Infinity]) {
  if (!Number.isNaN(context.__test.parseDistanceKm(input))) throw new Error(`KM inválido aceito: ${input}`);
}
const routeInput = {route:"SRT PETROLINA REDES",profile:"3/4",vehicleCount:"2",weight:"9410",weightUnit:"TON",km:"1.064",deliveries:"1"};
const importedKm = context.__test.recordToCalculated({raw:routeInput});
if (importedKm.km !== 1064 || importedKm.fleetKm !== 2128 || Math.abs(importedKm.cost - 12342.4) > 0.001) {
  throw new Error("1.064 km não recalculou a quilometragem e o custo dos dois carros");
}
if (importedKm.weight !== 9410 || importedKm.weightPerVehicle !== 4705) throw new Error("Correção de KM alterou a conversão de toneladas");

// File and paste imports enter through the same delimited matrix pipeline.
for (const delimiter of [";", "\t", ","]) {
  const csv = ["ROTA","PERFIL","CARROS","PESO","UNIDADE PESO","KM","ENTREGAS"].join(delimiter)+"\n"+
    ["SRT PETROLINA REDES","3/4","2","9410","KG","1.064","1"].join(delimiter);
  const matrix = context.__test.matrixToBulkRecords(context.__test.parseDelimited(csv));
  const load = context.__test.recordToCalculated(matrix.records[0]);
  if (load.km !== 1064 || load.weight !== 9410) throw new Error("KM de CSV/TSV/colagem incorreto");
}
const excelNumbers = context.__test.matrixToBulkRecords([
  ["ROTA","PERFIL","PESO","UNIDADE PESO","KM","ENTREGAS"],
  ["AG1 CARUARU","3/4",4500,"KG",1064,1]
]);
if (context.__test.recordToCalculated(excelNumbers.records[0]).km !== 1064) throw new Error("KM numérico da planilha alterado");

// The single-route form and the multi-row grid must follow the same rule.
Object.entries({"#route":"SRT PETROLINA REDES","#profile":"3/4","#freight-mode":"OWN",
  "#vehicle-count":"2","#weight":"9.41","#weight-unit":"TON","#km":"1.064",
  "#deliveries":"1","#customer-type":"NETWORK","#target-group":"SERTAO","#target":"0.793"})
  .forEach(([selector,value])=>{node(selector).value=value;});
const manualKm = context.__test.calculateLoad(context.__test.readForm());
if (manualKm.km !== 1064 || Math.abs(manualKm.cost - importedKm.cost) > 0.001) throw new Error("KM do formulário manual incorreto");
const gridRow = {querySelectorAll:()=>Object.entries(routeInput).map(([key,value])=>({dataset:{key},value}))};
context.document.querySelectorAll = selector=>selector === "#bulk-grid-rows tr" ? [gridRow] : [];
const gridKm = context.__test.recordToCalculated(context.__test.readBulkGrid()[0]);
if (gridKm.km !== 1064 || gridKm.weight !== 9410) throw new Error("KM da tabela manual incorreto");
context.document.querySelectorAll = ()=>[];

context.__test.prepareBulk([{rowNumber:2,raw:routeInput}]);
if (!node("#bulk-preview-rows").innerHTML.includes(">1.064</td>")) throw new Error("Conferência ainda exibe 1 km");
context.__test.setLoads([importedKm]);
context.__test.renderAll();
if (!node("#detail-rows").innerHTML.includes(">1.064<") || !node("#detail-rows").innerHTML.includes("12.342,40")) throw new Error("Resumo não mostra KM e custo corrigidos");
if (context.__test.aggregate().totalKm !== 2128) throw new Error("KM total da frota incorreto");

// Refreshing or duplicating a corrected route must not convert distance or tonnes twice.
context.localStorage.getItem=()=>JSON.stringify({date:"2026-10-08",loads:[importedKm]});
context.__test.restore();
const restoredKm=context.__test.getLoads()[0];
if (restoredKm.km !== 1064 || restoredKm.weight !== 9410) throw new Error("Dados convertidos novamente após recarregar");
context.__test.duplicateLoad(restoredKm.id);
const duplicatedKm=context.__test.getLoads()[1];
if (duplicatedKm.km !== 1064 || duplicatedKm.weight !== 9410) throw new Error("Dados convertidos novamente ao duplicar");

// Registered averages fill only missing distances; explicit distances remain authoritative.
assert.equal(Object.keys(context.__test.ROUTE_KM_AVERAGES).length, 42);
for (const [route, expected] of [
  ["AG1 CARUARU",157.47], ["AG1 CARUARU REDES",110.75],
  [" ag2  águas belas ",344.05], ["AG2 SÃO JOÃO",180],
  ["AG2 BELO JARDIM REDES",5.25], ["AG2 CORRENTES",354.53],
  ["AG2 GARANHUNS",171.03], ["AG2 GARANHUNS REDES",171.03],
  ["AG2 LAJEDO",180], ["SRT PETROLINA",1142.97], ["SRT PETROLINA REDES",1061.21],
  ["AG1 STC CAPIBARIBE REDES",168.91], ["SRT S. TALHADA REDES",458.42],
  ["Ceará",828], ["SRT Ouricuri",884], ["SRT Araripina Redes",1002],
  ["SRT Dormentes",1130], ["Juazeiro do Norte",828], ["CE Juazeiro do Norte",828]
]) {
  const load=context.__test.recordToCalculated({raw:{route,profile:"3/4",weight:4500,weightUnit:"KG",deliveries:3,km:""}});
  assert.equal(load.km,expected,route);
}
for (const route of Object.keys(context.__test.ROUTE_KM_AVERAGES)) {
  assert.ok(html.includes(`<option value="${route}">`),`Rota ausente nas opções: ${route}`);
}
const autoKmInput={route:"AG1 CARUARU",profile:"3/4",vehicleCount:2,weight:"9410",weightUnit:"TON",deliveries:18};
const autoKm=context.__test.recordToCalculated({raw:autoKmInput});
assert.equal(autoKm.km,157.47);
assert.equal(autoKm.fleetKm,314.94);
assert.ok(Math.abs(autoKm.cost-1826.652)<1e-8);
assert.equal(autoKm.weight,9410);
for (const [input,expected] of [["",157.47],["   ",157.47],["106,25",106.25],["1.064",1064],[0,0]]) {
  assert.equal(context.__test.recordToCalculated({raw:{...autoKmInput,km:input}}).km,expected);
}
assert.throws(()=>context.__test.recordToCalculated({raw:{...autoKmInput,km:"inválido"}}),/quilometragem válida/);
assert.throws(()=>context.__test.recordToCalculated({raw:{...autoKmInput,route:"ROTA SEM CADASTRO"}}),/sem média cadastrada/);
assert.equal(context.__test.recordToCalculated({raw:{...autoKmInput,route:"ROTA SEM CADASTRO",km:"210,5"}}).km,210.5);

// CSV, pasted data and spreadsheet matrices may omit the KM column entirely.
for (const delimiter of [";","\t",","]) {
  const csv=["ROTA","PERFIL","PESO","UNIDADE PESO","ENTREGAS"].join(delimiter)+"\n"+
    ["AG2 SÃO JOÃO","TOCO","6500","KG","12"].join(delimiter);
  const parsed=context.__test.matrixToBulkRecords(context.__test.parseDelimited(csv));
  assert.equal(context.__test.recordToCalculated(parsed.records[0]).km,180);
}
const optionalKmMatrix=context.__test.matrixToBulkRecords([
  ["ROTA","PERFIL","PESO","ENTREGAS"], ["AG2 BELO JARDIM REDES","TRUCK",11000,3]
]);
assert.equal(context.__test.recordToCalculated(optionalKmMatrix.records[0]).km,5.25);

// The four new destinations import together without KM and apply distance per car.
const estimatedRoutes=context.__test.matrixToBulkRecords(context.__test.parseDelimited(
  "ROTA;PERFIL;CARROS;PESO TOTAL (KG);ENTREGAS\n"+
  "Ceará;TRUCK;2;12.320,04;4\n"+
  "SRT Ouricuri;TRUCK;2;12.320,04;4\n"+
  "SRT Araripina Redes;TRUCK;2;12.320,04;4\n"+
  "SRT Dormentes;TRUCK;2;12.320,04;4"
));
for (const [index,km] of [828,884,1002,1130].entries()) {
  const load=context.__test.recordToCalculated(estimatedRoutes.records[index]);
  assert.equal(load.km,km);
  assert.equal(load.fleetKm,km*2);
  assert.ok(Math.abs(load.cost-km*2*5.3)<1e-8);
  assert.equal(load.weight,12320.04);
  assert.equal(load.group,index===0?"CE":"SERTAO");
  assert.equal(load.customerType,index===2?"NETWORK":"RETAIL");
}
assert.equal(context.__test.recordToCalculated({raw:{route:"Juazeiro do Norte",profile:"TRUCK",weight:12000,deliveries:4}}).group,"CE");

// Actual registered form handlers fill and replace averages without overwriting a same-route edit.
node("#route").value="AG1 CARUARU";
node("#route").dispatchEvent({type:"input"});
assert.equal(node("#km").value,"157,47");
assert.ok(node("#km-help").textContent.includes("157,47"));
node("#km").value="144,40";
node("#route").dispatchEvent({type:"change"});
assert.equal(node("#km").value,"144,40");
node("#route").value="AG2 SÃO JOÃO";
node("#route").dispatchEvent({type:"input"});
assert.equal(node("#km").value,"180,00");
assert.equal(context.__test.calculateLoad(context.__test.readForm()).km,180);
node("#route").value="Ceará";
node("#route").dispatchEvent({type:"input"});
assert.equal(node("#km").value,"828,00");
assert.ok(node("#km-help").textContent.includes("Estimativa cadastrada"));
assert.ok(node("#km-help").textContent.includes("Juazeiro do Norte"));
assert.ok(node("#km-help").textContent.includes("ida e volta"));
node("#km").value="900";
node("#route").dispatchEvent({type:"change"});
assert.equal(node("#km").value,"900");
node("#route").value="ROTA SEM CADASTRO";
node("#route").dispatchEvent({type:"change"});
assert.equal(node("#km").value,"");
assert.ok(node("#km-help").textContent.includes("sem média cadastrada"));

const gridKmInput={value:"",dataset:{}};
const routeCell={value:"AL MACEIÓ REDES",dataset:{key:"route"},closest:()=>({querySelector:()=>gridKmInput})};
node("#bulk-grid-rows").dispatchEvent({type:"input",target:routeCell});
assert.equal(gridKmInput.value,"435,89");
gridKmInput.value="420";
node("#bulk-grid-rows").dispatchEvent({type:"change",target:routeCell});
assert.equal(gridKmInput.value,"420");
const blankKmGrid={querySelectorAll:()=>Object.entries(autoKmInput).map(([key,value])=>({dataset:{key},value}))};
context.document.querySelectorAll=selector=>selector==="#bulk-grid-rows tr"?[blankKmGrid]:[];
assert.equal(context.__test.recordToCalculated(context.__test.readBulkGrid()[0]).km,157.47);
context.document.querySelectorAll=()=>[];

const bulkGridMarkup=context.__test.bulkGridRow().innerHTML;
assert.ok(!bulkGridMarkup.includes('data-key="km"'));

context.__test.prepareBulk([{rowNumber:2,raw:autoKmInput}]);
assert.ok(node("#bulk-preview-rows").innerHTML.includes(">157,47</td>"));
context.__test.setLoads([autoKm]);context.__test.renderAll();
assert.ok(node("#detail-rows").innerHTML.includes(">157,47<"));
assert.ok(node("#stat-grid").innerHTML.includes("314,94"));
context.localStorage.getItem=()=>JSON.stringify({loads:[autoKm,importedKm]});
context.__test.restore();
assert.equal(context.__test.getLoads()[0].km,157.47);
assert.equal(context.__test.getLoads()[1].km,1064);
context.__test.editLoad(importedKm.id);
node("#route").dispatchEvent({type:"change"});
assert.equal(context.__test.calculateLoad(context.__test.readForm()).km,1064);

// Changing display units must not change the normalized weights or freight calculations.
assert.equal(context.__test.formatTon(1000),"1 Ton");
assert.equal(context.__test.formatTon(9410),"9,41 Ton");
assert.equal(context.__test.formatTon(12320.04),"12,32004 Ton");
assert.equal(context.__test.formatTon(0.01),"0,00001 Ton");
assert.equal(node("#profile-capacity").textContent,"5 Ton");
context.__test.setLoads([importedKm]);context.__test.renderAll();
for (const selector of ["#load-rows","#detail-rows","#stat-grid","#profile-summary","#summary-foot"]) {
  assert.ok(node(selector).innerHTML.includes("Ton"),selector);
  assert.ok(!/\d[\d.,]*\s*kg\b/i.test(node(selector).innerHTML),selector);
}
for(const selector of ['#load-rows','#detail-rows']){
  const rows=node(selector).innerHTML;
  assert.ok(rows.includes('class="route-duration"'));
  assert.ok(rows.includes('class="minimum-weight'));
  assert.ok(rows.includes('Faltam 6,15419 Ton'));
  assert.ok(!rows.includes('km frota'));
  assert.ok(!/class="load-sub">[^<]*frota/.test(rows));
  assert.ok(rows.includes('>1.064</td>'),'KM da rota continua visível');
}
assert.ok(!node("#detail-rows").innerHTML.includes("Informado:"));
context.__test.prepareBulk([{rowNumber:2,raw:routeInput}]);
assert.ok(node("#bulk-preview-rows").innerHTML.includes("9,41 Ton"));
assert.ok(!/\d[\d.,]*\s*kg\b/i.test(node("#bulk-preview-rows").innerHTML));
// DOM stand-ins check content/style transfer and download lifecycle, not browser pixels.
const capture={height:900,imageError:false,frames:[],links:[],stylesCopied:0};
const summaryTemplate=html.match(/<section id="summary"[\s\S]*?<\/section>/)[0];
function summaryMarkup(){
  let markup=summaryTemplate;
  for(const id of ["stat-grid","detail-head","detail-rows","profile-summary","own-viability","contract-summary","overload-summary","summary-foot"]){
    markup=markup.replace(new RegExp(`(<(?:div|tbody|tr) id="${id}"[^>]*>)(<\\/(?:div|tbody|tr)>)`),(_,start,end)=>start+node(`#${id}`).innerHTML+end);
  }
  markup=markup.replace(/(<h3 id="overload-title">)[\s\S]*?(<\/h3>)/,(_,start,end)=>start+node("#overload-title").textContent+end);
  for(const id of ["summary-empty","summary-content","own-viability-card","contract-summary-card"]){
    markup=markup.replace(new RegExp(`(id="${id}"[^>]*class=")([^"]*)`),(_,start,classes)=>start+classes.replace(/\bis-hidden\b/g,"").trim()+(node(`#${id}`).classList.contains("is-hidden")?" is-hidden":""));
  }
  return markup;
}
function snapshotNode(tag,markup=""){
  return {tag,markup,nodeType:1,childNodes:[],style:{properties:{},setProperty(key,value){this.properties[key]=value;}},
    appendChild(child){this.childNodes.push(child);return child;},
    getBoundingClientRect(){return {height:capture.height};},
    querySelector(selector){return selector===".summary-actions"?{remove:()=>{this.markup=this.markup.replace(/<div class="summary-actions">[\s\S]*?<\/div>/,"");}}:null;},
    cloneNode(){const copy=snapshotNode(this.tag,this.markup);copy.childNodes=this.childNodes.map(child=>child.cloneNode(true));return copy;}
  };
}
const pageStyle=html.match(/<style>([\s\S]*?)<\/style>/)[1];
context.document.fonts={ready:Promise.resolve()};
context.document.body={appendChild(frame){capture.frames.push(frame);}};
context.document.querySelectorAll=selector=>selector==="style"?[{textContent:pageStyle}]:[];
node("#summary").getBoundingClientRect=()=>({width:1680});
node("#summary").querySelector=selector=>selector===".detail-table"?{scrollWidth:1000}:null;
const originalCreateElement=context.document.createElement;
context.document.createElement=tag=>{
  if(tag==="a"){const link={click(){this.clicked=true;}};capture.links.push(link);return link;}
  if(tag!=="iframe")return originalCreateElement(tag);
  const frame={style:{},setAttribute(key,value){this[key]=value;},remove(){this.removed=true;}};
  frame.contentDocument={body:snapshotNode("body"),fonts:{ready:Promise.resolve()},open(){},close(){},write(value){frame.documentHtml=value;},
    importNode(source,deep){assert.equal(source,node("#summary"));assert.equal(deep,true);return snapshotNode("section",summaryMarkup());}};
  frame.contentWindow={getComputedStyle(){capture.stylesCopied++;const props=["background-color","font-family"];return {0:props[0],1:props[1],length:2,getPropertyValue(key){return key===props[0]?"rgb(241, 246, 243)":"Segoe UI, sans-serif";},getPropertyPriority(){return "";}};}};
  return frame;
};
context.XMLSerializer=class{serializeToString(root){
  function serialize(el){const style=Object.entries(el.style.properties).map(([key,value])=>`${key}:${value}`).join(";");return el.markup?el.markup.replace("<section ",`<section style="${style}" `):`<${el.tag} xmlns="http://www.w3.org/1999/xhtml" style="${style}">${el.childNodes.map(serialize).join("")}</${el.tag}>`;}
  return serialize(root);
}};
context.Image=class{set src(value){capture.svg=decodeURIComponent(value.split(",").slice(1).join(","));queueMicrotask(()=>capture.imageError?this.onerror():this.onload());}};
node("#export-canvas").getContext=()=>({fillRect(){},drawImage(...args){capture.draw=args;}});
node("#export-canvas").toDataURL=()=>"data:image/png;base64,test";
async function exportPanelScenario(loads,height=900){
  context.__test.setLoads(loads);capture.height=height;
  const canvas=await context.__test.drawExport(),frame=capture.frames.at(-1);
  assert.equal(canvas.width,3456);assert.equal(canvas.height,height*2);
  assert.deepEqual(capture.draw.slice(1),[0,0,canvas.width,canvas.height]);
  assert.ok(frame.removed);assert.equal(frame["aria-hidden"],"true");
  assert.ok(frame.documentHtml.includes(pageStyle));
  assert.ok(frame.documentHtml.includes("grid-template-columns:minmax(0,1.55fr) minmax(360px,.75fr)"));
  assert.ok(frame.documentHtml.includes("grid-template-columns:repeat(6,minmax(0,1fr))"));
  assert.ok(capture.svg.includes("Segoe UI, sans-serif"));
  assert.ok(!capture.svg.includes("summary-actions"));
  assert.ok(!capture.svg.includes("Resumo por rota"));
  assert.ok(capture.svg.indexOf('class="detail-card"')<capture.svg.indexOf('class="side-stack"'));
  for(const id of ["stat-grid","detail-head","detail-rows","profile-summary","own-viability","contract-summary","overload-summary","summary-foot"]){
    assert.ok(capture.svg.includes(node(`#${id}`).innerHTML),`Conteúdo do site preservado: ${id}`);
  }
  return capture.svg;
}
let exportedSvg=await exportPanelScenario([importedKm]);
assert.ok(exportedSvg.includes("9,41 Ton"));
assert.ok(exportedSvg.includes("4,705 Ton"));
assert.ok(exportedSvg.includes("1.064"));
assert.ok(!/\d[\d.,]*\s*kg\b|PESO KG|KG\/CARRO|PESO INFORM/i.test(exportedSvg));
for(const label of ["Perfil","R$/KM","Peso total da rota","Peso/carro","Peso mínimo viável","Viab./saldo","Tempo total"]){assert.ok(exportedSvg.includes(label));}
assert.ok(exportedSvg.includes('class="route-duration"'));
assert.ok(exportedSvg.includes('class="minimum-weight'));
assert.ok(exportedSvg.includes('Faltam 6,15419 Ton'));
assert.ok(exportedSvg.includes('sem deslocamento'));
assert.ok(!/class="load-sub">[^<]*frota/.test(exportedSvg));
assert.equal(context.__test.getLoads()[0].weight,9410);
assert.ok(Math.abs(context.__test.getLoads()[0].cost-12342.4)<1e-8);

// Conditional cards retain the visibility used by the actual summary.
assert.ok(!node("#own-viability-card").classList.contains("is-hidden"));
assert.ok(node("#contract-summary-card").classList.contains("is-hidden"));
exportedSvg=await exportPanelScenario([contracted]);
assert.ok(node("#own-viability-card").classList.contains("is-hidden"));
assert.ok(!node("#contract-summary-card").classList.contains("is-hidden"));
for(const label of ["Valor das cargas","Fretes contratados","Saldo consolidado","Participação do frete","Sem veículos acima do limite"]){assert.ok(exportedSvg.includes(label));}
const overloads=Array.from({length:12},(_,i)=>context.__test.calculateLoad({...own,
  id:`export-over-${i}`,route:`AG1 ROTA ${i+1} ${"DESCRIÇÃO COMPLETA ".repeat(20)}`,
  vehicleCount:2,weight:12000,weightInput:12000,km:80
}));
exportedSvg=await exportPanelScenario([...overloads,contracted],2400);
assert.ok(exportedSvg.includes("24 veículos acima do limite"));
assert.ok(exportedSvg.includes("Excesso somado: 24 Ton"));
for(const load of overloads){assert.ok(exportedSvg.includes(load.route));}
assert.ok(capture.stylesCopied>=6);

// Failed rendering leaves no hidden iframe and lets the user retry the download.
capture.imageError=true;
await assert.rejects(()=>context.__test.drawExport(),/Não foi possível gerar o PNG/);
assert.ok(capture.frames.at(-1).removed);
await node("#download-png").listeners.click[0]();
assert.equal(node("#download-png").disabled,false);assert.equal(capture.links.length,0);
capture.imageError=false;
context.__test.setLoads([importedKm]);

// Check the actual form, import confirmation and date listeners, not just direct calls.
context.__test.setLoads([]);
node('#cancel-edit').listeners.click[0]();
for(const [selector,value] of Object.entries({'#route':'AG1 CARUARU','#freight-mode':'OWN','#profile':'3/4','#vehicle-count':'3','#weight':'15208','#weight-unit':'KG','#km':'157,47','#deliveries':'71','#customer-type':'RETAIL','#target-group':'AGRESTE_1','#target':'0.270'}))node(selector).value=value;
node('#load-form').listeners.submit[0]({preventDefault(){}});
assert.ok(detailCells()[0]['minimum-weight'].includes('10,14807 Ton'));
node('#summary-date').dispatchEvent({type:'change'});
assert.ok(detailCells()[0]['total-weight'].includes('15,208 Ton'));
context.__test.prepareBulk([{rowNumber:2,raw:{route:'AG1 CARUARU REDES',profile:'3/4',vehicleCount:3,weight:14600,deliveries:5}}]);
node('#confirm-bulk').listeners.click[0]();
const importedCells=detailCells().at(-1);
assert.ok(importedCells['total-weight'].includes('14,6 Ton'));
assert.ok(importedCells['minimum-weight'].includes('7,13723 Ton'));
assert.ok(importedCells['service-time'].includes('15h00'));
context.__test.setLoads([importedKm]);
node("#summary-date").value="2026-10-14";
const downloading=node("#download-png").listeners.click[0]();
assert.equal(node("#download-png").disabled,true);
await downloading;
assert.equal(node("#download-png").disabled,false);
assert.ok(capture.links.at(-1).clicked);
assert.equal(capture.links.at(-1).href,"data:image/png;base64,test");
assert.equal(capture.links.at(-1).download,"planejamento-rotas-2026-10-14.png");
context.__test.setLoads([]);
const frameCount=capture.frames.length;
await assert.rejects(()=>context.__test.drawExport(),/Adicione pelo menos uma rota/);
assert.equal(capture.frames.length,frameCount);
context.__test.setLoads([importedKm]);

console.log(JSON.stringify({
  regionalTargetsUpdated:true,
  legacyTargetsRecalculated:true,
  targetPrecisionThreeDecimals:true,
  weightDisplayOnlyTon:true,
  exportedImageWeightsOnlyTon:true,
  exportedConditionalPanels:true,
  exportedMeasuredFullHeight:true,
  exportedSiteDomAndStyles:true,
  exportedSideBySideLayout:true,
  exportFailureCleanupAndRetry:true,
  totalServiceTimeRetailAndNetwork:true,
  totalTimePreservesMultipleCarsAndOver24Hours:true,
  minimumWeightReachesViability:true,
  extraWeightNeededIncludesCurrentWeightAndCars:true,
  summaryHeaderAndCellsAlwaysAligned:true,
  startupManualImportAndDateRenderWeights:true,
  summaryRendererIsolatedFromOlderGlobals:true,
  minimumWeightCapacityWarning:true,
  duplicateFleetKmRemoved:true,
  registeredAverageRoutes:42,
  averageKmAutofill:true,
  explicitAndSavedKmPreserved:true,
  decimalKmVisibleInSummary:true,
  groupedKm: importedKm.km,
  groupedKmFleet: importedKm.fleetKm,
  groupedKmCost: importedKm.cost,
  kmImportFormGridAndSummary: true,
  distanceAndWeightSurviveReload: true,
  scriptSyntax: true,
  ownCost: own.cost,
  ownViability: own.viability,
  truckCapacity: truck.capacity,
  truckUtilization: truck.utilization,
  contractedBalance: contracted.financialBalance,
  totalVehicles: summary.vehicles,
  totalCapacity: summary.totalCapacity,
  totalCost: summary.totalCost,
  multiVehicleWeightPerCar: multiVehicle.weightPerVehicle,
  multiVehicleFleetKm: multiVehicle.fleetKm,
  multiVehicleCost: multiVehicle.cost,
  importedVehicleCount: importedFleet.vehicleCount,
  tonRouteWeightKg: tonRoute.weight,
  importedKgWeightKg: importedKg.weight,
  legacyUnitIgnoredWeightKg: importedLegacyUnit.weight,
  bulkPasteRows: parsedBulk.records.length,
  dailyImportRows: dailyFormat.records.length,
  dailyImportDate: dailyFormat.date,
}));

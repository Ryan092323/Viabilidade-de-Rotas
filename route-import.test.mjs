import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [fs.readFileSync(new URL("../data.js", import.meta.url), "utf8") + "\n" + fs.readFileSync(new URL("../app.js", import.meta.url), "utf8")];
if (scripts.length !== 1) throw new Error(`Esperado 1 script, encontrado ${scripts.length}`);

class FakeClassList {
  add() {}
  remove() {}
  toggle() {}
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
      addEventListener() {},
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
  localStorage: { getItem() { return null; }, setItem() {} },
  document: {
    modelContext: undefined,
    querySelector: node,
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
vm.runInContext(`${scripts[0]}\n;globalThis.__test={calculateLoad,aggregate,parseDelimited,matrixToBulkRecords,recordToCalculated,parseDateValue,parseDistanceKm,readForm,readBulkGrid,prepareBulk,renderAll,restore,duplicateLoad,getLoads:()=>loads,setLoads:value=>{loads=value}};`, context);

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
  target: 0.441,
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
  target: 0.441,
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
  target: 0.441,
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
  target: 0.441,
});

if (Math.abs(own.cost - 684.4) > 0.001) throw new Error("Custo próprio incorreto");
if (Math.abs(own.viability - (0.441 - 684.4 / 2800)) > 0.000001) throw new Error("Viabilidade própria incorreta");
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

const pastedWithTons = context.__test.parseDelimited("ROTA;PERFIL;CARROS;PESO TOTAL;UNIDADE PESO;KM;ENTREGAS\nAG1 CARUARU;3/4;2;9,41;TON;121;18");
const parsedWithTons = context.__test.matrixToBulkRecords(pastedWithTons);
const importedTons = context.__test.recordToCalculated(parsedWithTons.records[0]);
if (importedTons.weight !== 9410 || importedTons.weightUnit !== "TON" || importedTons.weightPerVehicle !== 4705) {
  throw new Error("Importação em toneladas incorreta");
}

node("#bulk-default-unit").value = "TON";
const defaultTons = context.__test.recordToCalculated({raw:{route:"AG1 CARUARU",profile:"3/4",vehicleCount:"2",weight:"9,41",km:"121",deliveries:"18"}});
if (defaultTons.weight !== 9410 || defaultTons.weightUnit !== "TON") throw new Error("Unidade padrão Ton não foi aplicada");
const embeddedTons = context.__test.recordToCalculated({raw:{route:"AG1 CARUARU",profile:"3/4",vehicleCount:"2",weight:"9,41 Ton",km:"121",deliveries:"18"}});
if (embeddedTons.weight !== 9410 || embeddedTons.weightUnit !== "TON") throw new Error("Ton escrita no peso não foi reconhecida");
const implicitDotTons = context.__test.recordToCalculated({raw:{route:"AG1 CARUARU",profile:"3/4",vehicleCount:"1",weight:"12.198",km:"121",deliveries:"18"}});
if (implicitDotTons.weight !== 12198 || implicitDotTons.weightUnit !== "TON") throw new Error("Valor 12.198 sem unidade deveria ser reconhecido como Ton");
const explicitKgThousands = context.__test.recordToCalculated({raw:{route:"AG1 CARUARU",profile:"3/4",vehicleCount:"1",weight:"12.198",weightUnit:"KG",km:"121",deliveries:"18"}});
if (explicitKgThousands.weight !== 12198 || explicitKgThousands.weightUnit !== "KG") throw new Error("Valor 12.198 explicitamente em kg deveria usar separador de milhar");
node("#bulk-default-unit").value = "KG";

const headerTons = context.__test.matrixToBulkRecords([
  ["ROTA","PERFIL","CARROS","PESO TOTAL (TON)","KM","ENTREGAS"],
  ["AG1 CARUARU","3/4","2","9,41","121","18"],
]);
const inferredTons = context.__test.recordToCalculated(headerTons.records[0]);
if (inferredTons.weight !== 9410 || inferredTons.weightUnit !== "TON") throw new Error("Unidade Ton do cabeçalho não foi reconhecida");

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
const routeInput = {route:"SRT PETROLINA REDES",profile:"3/4",vehicleCount:"2",weight:"9,41",weightUnit:"TON",km:"1.064",deliveries:"1"};
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
  "#deliveries":"1","#customer-type":"NETWORK","#target-group":"SERTAO","#target":"0.945"})
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

console.log(JSON.stringify({
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
  importedTonsWeightKg: importedTons.weight,
  defaultTonsWeightKg: defaultTons.weight,
  bulkPasteRows: parsedBulk.records.length,
  dailyImportRows: dailyFormat.records.length,
  dailyImportDate: dailyFormat.date,
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import {pointReading,finiteModel,segmentedRod,ELEMENTARY_CHARGE as e} from './foundation-physics.js';
test('Coulomb distance, source and probe are independent controls',()=>{
 const a=pointReading(1e-12,.002,e),b=pointReading(1e-12,.004,e),c=pointReading(2e-12,.002,e),d=pointReading(1e-12,.002,-2*e);
 assert.equal(b.E,a.E/4);assert.equal(c.E,2*a.E);assert.equal(d.E,a.E);assert.equal(d.F,-2*a.F);assert.equal(d.U,-2*a.U);
});
test('finite geometries approach their respective ideal limits',()=>{
 assert.ok(finiteModel('point',.0001,.01,1e-12).ratio>.9999);
 assert.ok(finiteModel('line',1,.001,1e-9).ratio>.99999);
 assert.ok(finiteModel('plane',1,.001,1e-6).ratio>.9989);
 assert.ok(finiteModel('line',.002,.002,1e-9).ratio<.5);
});
test('discrete Coulomb sums converge to finite rod result',()=>{
 const exact=finiteModel('point',.006,.002,1e-12).finite;
 const coarse=segmentedRod(1e-12,.006,.002,4),fine=segmentedRod(1e-12,.006,.002,256);
 assert.ok(Math.abs(fine[0])<1e-9);assert.ok(Math.abs(fine[1]-exact)<Math.abs(coarse[1]-exact));assert.ok(Math.abs(fine[1]/exact-1)<.00001);
});

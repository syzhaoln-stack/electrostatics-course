import test from 'node:test';import assert from 'node:assert/strict';
import {enclosedBallFraction,fluxSurfaceReading} from './flux-surface-physics.js';
const Q=.1,radius=.42,source=(pos,sign=1)=>({Q:Q*sign,radius,pos});
test('flux surface and independent enclosed charge agree inside, outside and for negative charge',()=>{
 for(const [radii,pos,sign] of [[[2.1,2.1,2.1],[0,0,0],1],[[2.1,2.1,2.1],[-3.7,0,0],1],[[2.1,2.1,2.1],[0,.7,.5],-1],[[2.8,1.4,2.1],[.4,.2,.1],1],[[2.8,1.4,2.1],[-3.7,0,0],1]]){
  const r=fluxSurfaceReading(radii,[source(pos,sign)]);assert.ok(r.error<2e-5,JSON.stringify(r));assert.ok(Math.abs(r.enclosedPC)<=Q);if(Math.hypot(...pos)<1)assert.equal(r.enclosedPC,Q*sign);
 }
});
test('ellipsoid crossing uses partial enclosed charge and agrees with surface integral',()=>{
 for(const pos of [[2.5,0,0],[0,1.5,0],[1.4,.8,.4]]){const r=fluxSurfaceReading([2.5,1.5,2.1],[source(pos)],{nu:96,np:192});assert.ok(r.enclosedPC>0&&r.enclosedPC<Q);assert.ok(r.error<8e-5,JSON.stringify(r));}
});
test('equal opposite charges give zero net flux although local field remains',()=>{const r=fluxSurfaceReading([2.5,1.5,2.1],[source([-.5,0,0]),source([.5,0,0],-1)]);assert.equal(r.enclosedPC,0);assert.ok(Math.abs(r.total)<1e-12);assert.ok(r.positive>0&&r.negative<0);});
test('ball overlaps continuously through an ellipsoid boundary',()=>{const values=[1.9,2.1,2.3,2.5,2.7,2.9,3.1].map(x=>enclosedBallFraction([2.5,1.5,2.1],[x,0,0],radius));assert.equal(values[0],1);assert.equal(values.at(-1),0);for(let i=1;i<values.length;i++)assert.ok(values[i]<=values[i-1]);});

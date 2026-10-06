import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { packageSelectionReducer as reduce, PackageSelectionState } from '../hooks/usePackageSelection';
import { PackageDecisionModal } from '../components/common/PackageDecisionModal';
vi.mock('react-dom', () => ({ createPortal: (node: React.ReactNode) => node }));
afterEach(() => vi.unstubAllGlobals());
const initial = (tierId: PackageSelectionState['tierId'], packs: number): PackageSelectionState => ({ tierId, quantities: { vanilla: packs }, pending: null });
describe('Package decision modals', () => {
 it.each([['silver',35], ['gold',55], ['platinum',70]] as const)('requires consent beyond the %s base', (tier,base) => {
  const state=initial(tier,base);
  const request=reduce(state,{type:'quantity',productId:'vanilla',delta:1});
  expect(request.quantities.vanilla).toBe(base);
  expect(request.pending?.kind).toBe('extras');
  expect(reduce(request,{type:'proceed'}).quantities.vanilla).toBe(base+1);
  expect(reduce(request,{type:'stay'}).quantities.vanilla).toBe(base);
  expect(reduce(request,{type:'cancel'})).toEqual(state);
 });
 it('sequences extras and smart upgrade when direct input crosses both thresholds', () => {
  const request=reduce(initial('silver',30),{type:'quantity',productId:'vanilla',value:51});
  expect(request.pending?.kind).toBe('extras');
  expect(request.quantities.vanilla).toBe(30);
  expect(reduce(request,{type:'stay'}).quantities.vanilla).toBe(35);
  const confirmed=reduce(request,{type:'proceed'});
  expect(confirmed.pending?.kind).toBe('upgrade');
  expect(confirmed.quantities.vanilla).toBe(51);
  expect(reduce(confirmed,{type:'upgrade'})).toEqual(initial('gold',55));
 });
 it('does not repeat consent within the accepted tier range', () => {
  const request=reduce(initial('silver',35),{type:'quantity',productId:'vanilla',delta:1});
  const accepted=reduce(request,{type:'proceed'});
  expect(reduce(accepted,{type:'quantity',productId:'vanilla',delta:1}).pending).toBeNull();
 });
 it.each([['silver',50,51],['gold',66,67]] as const)('opens smart upgrade at the %s savings threshold', (tier,before,threshold) => {
  const below=reduce(initial(tier,before-1),{type:'quantity',productId:'vanilla',delta:1});
  expect(below.pending).toBeNull();
  const prompt=reduce(below,{type:'quantity',productId:'vanilla',delta:1});
  expect(prompt.pending?.kind).toBe('upgrade');
  const kept=reduce(prompt,{type:'keep'});
  expect(kept.quantities.vanilla).toBe(threshold);
  expect(kept.pending).toBeNull();
  expect(reduce(kept,{type:'quantity',productId:'vanilla',delta:1}).pending).toBeNull();
 });
 it.each([['silver',54],['gold',69]] as const)('requires a new decision at the %s upper threshold', (tier,cap) => {
  const request=reduce(initial(tier,cap-1),{type:'quantity',productId:'vanilla',delta:1});
  expect(request.pending?.kind).toBe('extras');
  const confirmed=reduce(request,{type:'proceed'});
  expect(confirmed.quantities.vanilla).toBe(cap);
  expect(confirmed.pending?.kind).toBe('upgrade');
  const beyond=reduce(initial(tier,cap),{type:'quantity',productId:'vanilla',delta:1});
  expect(beyond.pending?.attemptedTotal).toBe(cap+1);
  expect(reduce(beyond,{type:'proceed'}).quantities.vanilla).toBe(cap);
 });
 it('preserves other flavors while clamping and selected flavors while upgrading', () => {
  const state: PackageSelectionState={tierId:'silver',quantities:{vanilla:30,chocolate:21},pending:null};
  const capped=reduce(state,{type:'quantity',productId:'vanilla',value:100});
  expect(capped.pending?.quantities).toEqual({vanilla:33,chocolate:21});
  expect(reduce(reduce(capped,{type:'proceed'}),{type:'upgrade'}).quantities).toEqual({vanilla:34,chocolate:21});
 });
 it('asks before a tier switch trims quantities and cancels without losing them', () => {
  const state=initial('platinum',75);
  const request=reduce(state,{type:'tier',tierId:'silver'});
  expect(request.pending?.kind).toBe('extras');
  expect(request.tierId).toBe('platinum');
  expect(reduce(request,{type:'cancel'})).toEqual(state);
  expect(reduce(request,{type:'stay'})).toEqual(initial('silver',35));
 });
 it('blocks input while pending and clears decisions on reset', () => {
  const pending=reduce(initial('silver',35),{type:'quantity',productId:'vanilla',delta:1});
  expect(reduce(pending,{type:'quantity',productId:'vanilla',delta:1})).toEqual(pending);
  expect(reduce(pending,{type:'reset',tierId:'gold'})).toEqual({tierId:'gold',quantities:{},pending:null});
 });
 it('renders modal markup with the requested action pairs', () => {
  vi.stubGlobal('document',{body:{}});
  const extras=reduce(initial('silver',35),{type:'quantity',productId:'vanilla',value:51});
  const render=(pending: PackageSelectionState['pending']) => renderToStaticMarkup(React.createElement(PackageDecisionModal,{pending,onAction:()=>{}}));
  const html=render(extras.pending);
  expect(html).toContain('role="alertdialog"');
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain('max-w-md');
  expect(html).toContain('Proceed with Extra Packs');
  expect(html).toContain('Stay with Base Package');
  const smart=render(reduce(extras,{type:'proceed'}).pending);
  expect(smart).toContain('Smart Upgrade Available');
  expect(smart).toContain('5,839.00');
  expect(smart).toContain('Upgrade to Gold');
  expect(smart).toContain('Keep Current Selection');
 });
});

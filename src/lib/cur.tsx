'use client';
import { createContext, useContext } from 'react';
import { fmt } from './money';

export const CurCtx = createContext('EUR');
export const useCur = () => useContext(CurCtx);
export const useFmt = () => { const c = useCur(); return (cents: number) => fmt(cents, c); };
export const accountChanged = () => window.dispatchEvent(new Event('zelko:account'));

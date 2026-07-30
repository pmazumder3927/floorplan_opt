import { analyzeLayout, formatReport } from '@/core/analysis';
import { getPlan } from '@/core/plan';
import layout from '@/layouts/c-second-row';

const r = analyzeLayout(getPlan(layout.plan), layout);
console.log(formatReport(r, { color: false }));

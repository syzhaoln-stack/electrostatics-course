import katex from './vendor/katex/katex.esm.js';
const T=String.raw;
export const DISPLAY_MATH={
 foundations:[T`\mathbf E(P)=\frac{\mathbf F}{q},\qquad \mathbf F=q\mathbf E(P)`,T`E=\frac{k|Q|}{r^2}`],
 field:[T`\mathbf E(P)=\mathbf E_1(P)+\mathbf E_2(P),\qquad \mathbf F(P)=q\mathbf E(P)`],
 flux:[T`\Phi_E=\oiint_S\mathbf E\cdot\mathrm d\mathbf A=\frac{Q_{\mathrm{in}}}{\varepsilon_0}`],
 symmetry:[T`\oiint_S\mathbf E\cdot\mathrm d\mathbf A\;\overset{\text{对称性}}{=}\;E A_{\mathrm{eff}}`,T`E_{\mathrm{sphere}}=\frac{|Q|}{4\pi\varepsilon_0r^2},\qquad E_{\mathrm{line}}=\frac{|\lambda|}{2\pi\varepsilon_0r},\qquad E_{\mathrm{plane}}=\frac{|\sigma|}{2\varepsilon_0}`],
 potential:[T`V(P)=\sum_iV_i(P),\qquad W_{A\to B}=q(V_A-V_B)=-\Delta U`,T`V(P)=\frac{1}{4\pi\varepsilon_0}\left(\frac{Q_1}{r_1}+\frac{Q_2}{r_2}\right)`],
 paths:[T`V_B-V_A=-\int_A^B\mathbf E\cdot\mathrm d\mathbf r,\qquad \oint\mathbf E\cdot\mathrm d\mathbf r=0`,T`E_s=-\frac{\partial V}{\partial s},\qquad\mathbf E=-\nabla V`],
 conductors:[T`\begin{aligned}\text{导体内：}&\quad\mathbf E_{\mathrm{tot}}=\mathbf0,\quad V=\text{常数},\\\text{表面外：}&\quad E_{\parallel}=0,\quad E_n=\sigma/\varepsilon_0.\end{aligned}`,T`\begin{aligned}r<R:&\quad E_r=0,\quad V=kQ/R,\\r>R:&\quad E_r=kQ/r^2,\quad V=kQ/r.\end{aligned}`]
};
const INLINE=new Map([
 ['F',T`\mathbf F`],['E',T`\mathbf E`],['a = qE/m',T`\mathbf a=\frac{q}{m}\mathbf E`],
 ['E = kQ r̂/r²',T`\mathbf E=kQ\hat{\mathbf r}/r^2`],['F = kQq r̂/r²',T`\mathbf F=kQq\hat{\mathbf r}/r^2`],
 ['E = ∫ k r̂ dq/r²',T`\mathbf E=\int\frac{k\hat{\mathbf r}}{r^2}\,\mathrm dq`],
 ['dΦ = E·n̂ dA = E cosθ dA',T`\mathrm d\Phi=\mathbf E\cdot\hat{\mathbf n}\,\mathrm dA=E\cos\theta\,\mathrm dA`],
 ['V(P) = U(P)/q',T`V(P)=U(P)/q`],['U = qV',T`U=qV`],['dW = qE·dr',T`\mathrm dW=q\mathbf E\cdot\mathrm d\mathbf r`],
 ['导体材料内部的总电场为零',null],
 ['E·4πr² = |Q|/ε₀',T`E\,4\pi r^2=|Q|/\varepsilon_0`],['|Q|/(4πε₀r²)',T`|Q|/(4\pi\varepsilon_0r^2)`],
 ['E·2πrL = |λ|L/ε₀',T`E\,2\pi rL=|\lambda|L/\varepsilon_0`],['|λ|/(2πε₀r)',T`|\lambda|/(2\pi\varepsilon_0r)`],
 ['2EA = |σ|A/ε₀',T`2EA=|\sigma|A/\varepsilon_0`],['|σ|/(2ε₀)',T`|\sigma|/(2\varepsilon_0)`]
]);
export function renderMath(node,tex,display=false){
 node.dataset.tex=tex;katex.render(tex,node,{displayMode:display,throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'});
}
export function typesetBook(root,unit,index){
 let count=0;
 for(const block of root.querySelectorAll('.book-equation')){
  const original=block.querySelector('strong'),formula=document.createElement('div'),number=document.createElement('span');
  formula.className='book-equation-math';number.className='book-equation-number';number.textContent=`(${index+1}.${++count})`;
  const tex=DISPLAY_MATH[unit.id]?.[count-1];if(tex){renderMath(formula,tex,true);original.replaceWith(formula);block.insertBefore(number,formula.nextSibling);}
 }
 for(const node of root.querySelectorAll('.book-prose b,.book-table td')){const tex=INLINE.get(node.textContent.trim());if(tex)renderMath(node,tex);}
 for(const node of root.querySelectorAll('[data-tex]:not(.book-equation-math)'))renderMath(node,node.dataset.tex,false);
 let sub=0;for(const heading of root.querySelectorAll('.book-prose h2')){const marker=document.createElement('span');marker.className='book-subnumber';marker.textContent=`${index+1}.${++sub}`;heading.prepend(marker);}
 let example=0;for(const block of root.querySelectorAll('.book-example')){const head=block.querySelector('b');if(head){const marker=document.createElement('span');marker.className='book-example-number';marker.textContent=`例 ${index+1}.${++example}　`;head.prepend(marker);}}
}

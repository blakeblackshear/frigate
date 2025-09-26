import{a as K}from"./chunk-4KE642ED.mjs";import{a as J}from"./chunk-353K7GK5.mjs";import"./chunk-DY3L2I7V.mjs";import"./chunk-6DHVG6KC.mjs";import"./chunk-EOITJJC2.mjs";import"./chunk-TLYDTAVK.mjs";import"./chunk-JXEFGRG2.mjs";import"./chunk-6XQQT3RD.mjs";import{a as Q}from"./chunk-ASAHGCDZ.mjs";import{k as Z,l as H}from"./chunk-EFRVIJHI.mjs";import"./chunk-THXVA4DE.mjs";import{L as _,O as z,P as B,Q as M,R as W,S as I,T as L,U as N,W as q,i as j}from"./chunk-KXVH62NG.mjs";import{F as C,I as U,b as p,m as V}from"./chunk-63GW7ZVL.mjs";import"./chunk-XW6ABFJP.mjs";import"./chunk-2XYWPRAO.mjs";import"./chunk-OMTJKCYW.mjs";import"./chunk-IQQE2MEC.mjs";import"./chunk-A4ITRWGT.mjs";import{a as r}from"./chunk-GTKDMUJJ.mjs";var X=j.pie,w={sections:new Map,showData:!1,config:X},f=w.sections,A=w.showData,pe=structuredClone(X),me=r(()=>structuredClone(pe),"getConfig"),de=r(()=>{f=new Map,A=w.showData,z()},"clear"),fe=r(({label:e,value:i})=>{if(i<0)throw new Error(`"${e}" has invalid value: ${i}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);f.has(e)||(f.set(e,i),p.debug(`added new section: ${e}, with value: ${i}`))},"addSection"),ge=r(()=>f,"getSections"),De=r(e=>{A=e},"setShowData"),ue=r(()=>A,"getShowData"),g={getConfig:me,clear:de,setDiagramTitle:L,getDiagramTitle:N,setAccTitle:B,getAccTitle:M,setAccDescription:W,getAccDescription:I,addSection:fe,getSections:ge,setShowData:De,getShowData:ue};var Se=r((e,i)=>{K(e,i),i.setShowData(e.showData),e.sections.map(i.addSection)},"populateDb"),Y={parse:r(async e=>{let i=await J("pie",e);p.debug(i),Se(i,g)},"parse")};var ye=r(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,"getStyles"),ee=ye;var he=r(e=>{let i=[...e.values()].reduce((o,n)=>o+n,0),T=[...e.entries()].map(([o,n])=>({label:o,value:n})).filter(o=>o.value/i*100>=1).sort((o,n)=>n.value-o.value);return U().value(o=>o.value)(T)},"createPieArcs"),Pe=r((e,i,T,v)=>{p.debug(`rendering pie chart
`+e);let o=v.db,n=q(),$=H(o.getConfig(),n.pie),b=40,s=18,m=4,c=450,D=c,u=Q(i),l=u.append("g");l.attr("transform","translate("+D/2+","+c/2+")");let{themeVariables:a}=n,[E]=Z(a.pieOuterStrokeWidth);E??=2;let G=$.textPosition,d=Math.min(D,c)/2-b,ie=C().innerRadius(0).outerRadius(d),re=C().innerRadius(d*G).outerRadius(d*G);l.append("circle").attr("cx",0).attr("cy",0).attr("r",d+E/2).attr("class","pieOuterCircle");let S=o.getSections(),oe=he(S),ae=[a.pie1,a.pie2,a.pie3,a.pie4,a.pie5,a.pie6,a.pie7,a.pie8,a.pie9,a.pie10,a.pie11,a.pie12],y=0;S.forEach(t=>{y+=t});let k=oe.filter(t=>(t.data.value/y*100).toFixed(0)!=="0"),h=V(ae);l.selectAll("mySlices").data(k).enter().append("path").attr("d",ie).attr("fill",t=>h(t.data.label)).attr("class","pieCircle"),l.selectAll("mySlices").data(k).enter().append("text").text(t=>(t.data.value/y*100).toFixed(0)+"%").attr("transform",t=>"translate("+re.centroid(t)+")").style("text-anchor","middle").attr("class","slice"),l.append("text").text(o.getDiagramTitle()).attr("x",0).attr("y",-(c-50)/2).attr("class","pieTitleText");let F=[...S.entries()].map(([t,x])=>({label:t,value:x})),P=l.selectAll(".legend").data(F).enter().append("g").attr("class","legend").attr("transform",(t,x)=>{let O=s+m,se=O*F.length/2,ce=12*s,le=x*O-se;return"translate("+ce+","+le+")"});P.append("rect").attr("width",s).attr("height",s).style("fill",t=>h(t.label)).style("stroke",t=>h(t.label)),P.append("text").attr("x",s+m).attr("y",s-m).text(t=>o.getShowData()?`${t.label} [${t.value}]`:t.label);let ne=Math.max(...P.selectAll("text").nodes().map(t=>t?.getBoundingClientRect().width??0)),R=D+b+s+m+ne;u.attr("viewBox",`0 0 ${R} ${c}`),_(u,c,R,$.useMaxWidth)},"draw"),te={draw:Pe};var Ue={parser:Y,db:g,renderer:te,styles:ee};export{Ue as diagram};

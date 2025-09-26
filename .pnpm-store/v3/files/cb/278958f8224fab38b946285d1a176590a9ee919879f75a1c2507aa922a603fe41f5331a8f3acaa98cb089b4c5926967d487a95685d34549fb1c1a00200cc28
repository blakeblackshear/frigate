import{a as j}from"./chunk-4KE642ED.mjs";import{a as T}from"./chunk-353K7GK5.mjs";import"./chunk-DY3L2I7V.mjs";import"./chunk-6DHVG6KC.mjs";import"./chunk-EOITJJC2.mjs";import"./chunk-TLYDTAVK.mjs";import"./chunk-JXEFGRG2.mjs";import"./chunk-6XQQT3RD.mjs";import{a as V}from"./chunk-ASAHGCDZ.mjs";import{l as R}from"./chunk-EFRVIJHI.mjs";import"./chunk-THXVA4DE.mjs";import{O as A,P as w,Q as S,R as M,S as O,T as G,U as L,g as D,i as v,q as C}from"./chunk-KXVH62NG.mjs";import{b as $}from"./chunk-63GW7ZVL.mjs";import"./chunk-XW6ABFJP.mjs";import"./chunk-2XYWPRAO.mjs";import"./chunk-OMTJKCYW.mjs";import"./chunk-IQQE2MEC.mjs";import"./chunk-A4ITRWGT.mjs";import{a as i}from"./chunk-GTKDMUJJ.mjs";var f={showLegend:!0,ticks:5,max:null,min:0,graticule:"circle"},P={axes:[],curves:[],options:f},g=structuredClone(P),q=v.radar,z=i(()=>R({...q,...C().radar}),"getConfig"),k=i(()=>g.axes,"getAxes"),W=i(()=>g.curves,"getCurves"),H=i(()=>g.options,"getOptions"),N=i(e=>{g.axes=e.map(t=>({name:t.name,label:t.label??t.name}))},"setAxes"),U=i(e=>{g.curves=e.map(t=>({name:t.name,label:t.label??t.name,entries:X(t.entries)}))},"setCurves"),X=i(e=>{if(e[0].axis==null)return e.map(r=>r.value);let t=k();if(t.length===0)throw new Error("Axes must be populated before curves for reference entries");return t.map(r=>{let a=e.find(o=>o.axis?.$refText===r.name);if(a===void 0)throw new Error("Missing entry for axis "+r.label);return a.value})},"computeCurveEntries"),Y=i(e=>{let t=e.reduce((r,a)=>(r[a.name]=a,r),{});g.options={showLegend:t.showLegend?.value??f.showLegend,ticks:t.ticks?.value??f.ticks,max:t.max?.value??f.max,min:t.min?.value??f.min,graticule:t.graticule?.value??f.graticule}},"setOptions"),Z=i(()=>{A(),g=structuredClone(P)},"clear"),x={getAxes:k,getCurves:W,getOptions:H,setAxes:N,setCurves:U,setOptions:Y,getConfig:z,clear:Z,setAccTitle:w,getAccTitle:S,setDiagramTitle:G,getDiagramTitle:L,getAccDescription:O,setAccDescription:M};var J=i(e=>{j(e,x);let{axes:t,curves:r,options:a}=e;x.setAxes(t),x.setCurves(r),x.setOptions(a)},"populate"),E={parse:i(async e=>{let t=await T("radar",e);$.debug(t),J(t)},"parse")};var K=i((e,t,r,a)=>{let o=a.db,s=o.getAxes(),m=o.getCurves(),n=o.getOptions(),l=o.getConfig(),c=o.getDiagramTitle(),p=V(t),d=Q(p,l),u=n.max??Math.max(...m.map(b=>Math.max(...b.entries))),h=n.min,y=Math.min(l.width,l.height)/2;tt(d,s,y,n.ticks,n.graticule),rt(d,s,y,l),et(d,s,m,h,u,n.graticule,l),nt(d,m,n.showLegend,l),d.append("text").attr("class","radarTitle").text(c).attr("x",0).attr("y",-l.height/2-l.marginTop)},"draw"),Q=i((e,t)=>{let r=t.width+t.marginLeft+t.marginRight,a=t.height+t.marginTop+t.marginBottom,o={x:t.marginLeft+t.width/2,y:t.marginTop+t.height/2};return e.attr("viewbox",`0 0 ${r} ${a}`).attr("width",r).attr("height",a),e.append("g").attr("transform",`translate(${o.x}, ${o.y})`)},"drawFrame"),tt=i((e,t,r,a,o)=>{if(o==="circle")for(let s=0;s<a;s++){let m=r*(s+1)/a;e.append("circle").attr("r",m).attr("class","radarGraticule")}else if(o==="polygon"){let s=t.length;for(let m=0;m<a;m++){let n=r*(m+1)/a,l=t.map((c,p)=>{let d=2*p*Math.PI/s-Math.PI/2,u=n*Math.cos(d),h=n*Math.sin(d);return`${u},${h}`}).join(" ");e.append("polygon").attr("points",l).attr("class","radarGraticule")}}},"drawGraticule"),rt=i((e,t,r,a)=>{let o=t.length;for(let s=0;s<o;s++){let m=t[s].label,n=2*s*Math.PI/o-Math.PI/2;e.append("line").attr("x1",0).attr("y1",0).attr("x2",r*a.axisScaleFactor*Math.cos(n)).attr("y2",r*a.axisScaleFactor*Math.sin(n)).attr("class","radarAxisLine"),e.append("text").text(m).attr("x",r*a.axisLabelFactor*Math.cos(n)).attr("y",r*a.axisLabelFactor*Math.sin(n)).attr("class","radarAxisLabel")}},"drawAxes");function et(e,t,r,a,o,s,m){let n=t.length,l=Math.min(m.width,m.height)/2;r.forEach((c,p)=>{if(c.entries.length!==n)return;let d=c.entries.map((u,h)=>{let y=2*Math.PI*h/n-Math.PI/2,b=at(u,a,o,l),_=b*Math.cos(y),B=b*Math.sin(y);return{x:_,y:B}});s==="circle"?e.append("path").attr("d",ot(d,m.curveTension)).attr("class",`radarCurve-${p}`):s==="polygon"&&e.append("polygon").attr("points",d.map(u=>`${u.x},${u.y}`).join(" ")).attr("class",`radarCurve-${p}`)})}i(et,"drawCurves");function at(e,t,r,a){let o=Math.min(Math.max(e,t),r);return a*(o-t)/(r-t)}i(at,"relativeRadius");function ot(e,t){let r=e.length,a=`M${e[0].x},${e[0].y}`;for(let o=0;o<r;o++){let s=e[(o-1+r)%r],m=e[o],n=e[(o+1)%r],l=e[(o+2)%r],c={x:m.x+(n.x-s.x)*t,y:m.y+(n.y-s.y)*t},p={x:n.x-(l.x-m.x)*t,y:n.y-(l.y-m.y)*t};a+=` C${c.x},${c.y} ${p.x},${p.y} ${n.x},${n.y}`}return`${a} Z`}i(ot,"closedRoundCurve");function nt(e,t,r,a){if(!r)return;let o=(a.width/2+a.marginRight)*3/4,s=-(a.height/2+a.marginTop)*3/4,m=20;t.forEach((n,l)=>{let c=e.append("g").attr("transform",`translate(${o}, ${s+l*m})`);c.append("rect").attr("width",12).attr("height",12).attr("class",`radarLegendBox-${l}`),c.append("text").attr("x",16).attr("y",0).attr("class","radarLegendText").text(n.label)})}i(nt,"drawLegend");var I={draw:K};var it=i((e,t)=>{let r="";for(let a=0;a<e.THEME_COLOR_LIMIT;a++){let o=e[`cScale${a}`];r+=`
		.radarCurve-${a} {
			color: ${o};
			fill: ${o};
			fill-opacity: ${t.curveOpacity};
			stroke: ${o};
			stroke-width: ${t.curveStrokeWidth};
		}
		.radarLegendBox-${a} {
			fill: ${o};
			fill-opacity: ${t.curveOpacity};
			stroke: ${o};
		}
		`}return r},"genIndexStyles"),st=i(e=>{let t=D(),r=C(),a=R(t,r.themeVariables),o=R(a.radar,e);return{themeVariables:a,radarOptions:o}},"buildRadarStyleOptions"),F=i(({radar:e}={})=>{let{themeVariables:t,radarOptions:r}=st(e);return`
	.radarTitle {
		font-size: ${t.fontSize};
		color: ${t.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${r.axisColor};
		stroke-width: ${r.axisStrokeWidth};
	}
	.radarAxisLabel {
		dominant-baseline: middle;
		text-anchor: middle;
		font-size: ${r.axisLabelFontSize}px;
		color: ${r.axisColor};
	}
	.radarGraticule {
		fill: ${r.graticuleColor};
		fill-opacity: ${r.graticuleOpacity};
		stroke: ${r.graticuleColor};
		stroke-width: ${r.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${r.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${it(t,r)}
	`},"styles");var Tt={parser:E,db:x,renderer:I,styles:F};export{Tt as diagram};

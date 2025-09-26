import{a as A}from"./chunk-4KE642ED.mjs";import{a as j}from"./chunk-353K7GK5.mjs";import"./chunk-DY3L2I7V.mjs";import"./chunk-6DHVG6KC.mjs";import"./chunk-EOITJJC2.mjs";import"./chunk-TLYDTAVK.mjs";import"./chunk-JXEFGRG2.mjs";import"./chunk-6XQQT3RD.mjs";import{a as E}from"./chunk-ASAHGCDZ.mjs";import{l as y}from"./chunk-EFRVIJHI.mjs";import"./chunk-THXVA4DE.mjs";import{L as x,O as B,P as C,Q as S,R as $,S as v,T,U as W,i as P,q as w}from"./chunk-KXVH62NG.mjs";import{b as h}from"./chunk-63GW7ZVL.mjs";import"./chunk-XW6ABFJP.mjs";import"./chunk-2XYWPRAO.mjs";import"./chunk-OMTJKCYW.mjs";import"./chunk-IQQE2MEC.mjs";import"./chunk-A4ITRWGT.mjs";import{a as c}from"./chunk-GTKDMUJJ.mjs";var O=P.packet,b=class{constructor(){this.packet=[];this.setAccTitle=C;this.getAccTitle=S;this.setDiagramTitle=T;this.getDiagramTitle=W;this.getAccDescription=v;this.setAccDescription=$}static{c(this,"PacketDB")}getConfig(){let t=y({...O,...w().packet});return t.showBits&&(t.paddingY+=10),t}getPacket(){return this.packet}pushWord(t){t.length>0&&this.packet.push(t)}clear(){B(),this.packet=[]}};var _=1e4,V=c((e,t)=>{A(e,t);let a=-1,o=[],s=1,{bitsPerRow:l}=t.getConfig();for(let{start:r,end:n,bits:d,label:p}of e.blocks){if(r!==void 0&&n!==void 0&&n<r)throw new Error(`Packet block ${r} - ${n} is invalid. End must be greater than start.`);if(r??=a+1,r!==a+1)throw new Error(`Packet block ${r} - ${n??r} is not contiguous. It should start from ${a+1}.`);if(d===0)throw new Error(`Packet block ${r} is invalid. Cannot have a zero bit field.`);for(n??=r+(d??1)-1,d??=n-r+1,a=n,h.debug(`Packet block ${r} - ${a} with label ${p}`);o.length<=l+1&&t.getPacket().length<_;){let[m,i]=q({start:r,end:n,bits:d,label:p},s,l);if(o.push(m),m.end+1===s*l&&(t.pushWord(o),o=[],s++),!i)break;({start:r,end:n,bits:d,label:p}=i)}}t.pushWord(o)},"populate"),q=c((e,t,a)=>{if(e.start===void 0)throw new Error("start should have been set during first phase");if(e.end===void 0)throw new Error("end should have been set during first phase");if(e.start>e.end)throw new Error(`Block start ${e.start} is greater than block end ${e.end}.`);if(e.end+1<=t*a)return[e,void 0];let o=t*a-1,s=t*a;return[{start:e.start,end:o,label:e.label,bits:o-e.start},{start:s,end:e.end,label:e.label,bits:e.end-s}]},"getNextFittingBlock"),D={parser:{yy:void 0},parse:c(async e=>{let t=await j("packet",e),a=D.parser?.yy;if(!(a instanceof b))throw new Error("parser.parser?.yy was not a PacketDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues.");h.debug(t),V(t,a)},"parse")};var L=c((e,t,a,o)=>{let s=o.db,l=s.getConfig(),{rowHeight:r,paddingY:n,bitWidth:d,bitsPerRow:p}=l,m=s.getPacket(),i=s.getDiagramTitle(),g=r+n,f=g*(m.length+1)-(i?0:r),k=d*p+2,u=E(t);u.attr("viewbox",`0 0 ${k} ${f}`),x(u,f,k,l.useMaxWidth);for(let[G,R]of m.entries())M(u,R,G,l);u.append("text").text(i).attr("x",k/2).attr("y",f-g/2).attr("dominant-baseline","middle").attr("text-anchor","middle").attr("class","packetTitle")},"draw"),M=c((e,t,a,{rowHeight:o,paddingX:s,paddingY:l,bitWidth:r,bitsPerRow:n,showBits:d})=>{let p=e.append("g"),m=a*(o+l)+l;for(let i of t){let g=i.start%n*r+1,f=(i.end-i.start+1)*r-s;if(p.append("rect").attr("x",g).attr("y",m).attr("width",f).attr("height",o).attr("class","packetBlock"),p.append("text").attr("x",g+f/2).attr("y",m+o/2).attr("class","packetLabel").attr("dominant-baseline","middle").attr("text-anchor","middle").text(i.label),!d)continue;let k=i.end===i.start,u=m-2;p.append("text").attr("x",g+(k?f/2:0)).attr("y",u).attr("class","packetByte start").attr("dominant-baseline","auto").attr("text-anchor",k?"middle":"start").text(i.start),k||p.append("text").attr("x",g+f).attr("y",u).attr("class","packetByte end").attr("dominant-baseline","auto").attr("text-anchor","end").text(i.end)}},"drawWord"),F={draw:L};var N={byteFontSize:"10px",startByteColor:"black",endByteColor:"black",labelColor:"black",labelFontSize:"12px",titleColor:"black",titleFontSize:"14px",blockStrokeColor:"black",blockStrokeWidth:"1",blockFillColor:"#efefef"},z=c(({packet:e}={})=>{let t=y(N,e);return`
	.packetByte {
		font-size: ${t.byteFontSize};
	}
	.packetByte.start {
		fill: ${t.startByteColor};
	}
	.packetByte.end {
		fill: ${t.endByteColor};
	}
	.packetLabel {
		fill: ${t.labelColor};
		font-size: ${t.labelFontSize};
	}
	.packetTitle {
		fill: ${t.titleColor};
		font-size: ${t.titleFontSize};
	}
	.packetBlock {
		stroke: ${t.blockStrokeColor};
		stroke-width: ${t.blockStrokeWidth};
		fill: ${t.blockFillColor};
	}
	`},"styles");var gt={parser:D,get db(){return new b},renderer:F,styles:z};export{gt as diagram};

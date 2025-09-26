import{a as dt,b as pt,c as gt,f as U}from"./chunk-WONJCSFZ.mjs";import{a as mt}from"./chunk-ZZTKAOFA.mjs";import"./chunk-THXVA4DE.mjs";import{L as at,O as ot,P as lt,Q as ct,R as ht,S as ut,T as yt,U as ft,W as P}from"./chunk-KXVH62NG.mjs";import{F as G,h as z}from"./chunk-63GW7ZVL.mjs";import{a as i}from"./chunk-GTKDMUJJ.mjs";var Z=(function(){var t=i(function(h,n,a,o){for(a=a||{},o=h.length;o--;a[h[o]]=n);return a},"o"),e=[6,8,10,11,12,14,16,17,18],s=[1,9],c=[1,10],r=[1,11],d=[1,12],u=[1,13],f=[1,14],g={trace:i(function(){},"trace"),yy:{},symbols_:{error:2,start:3,journey:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NEWLINE:10,title:11,acc_title:12,acc_title_value:13,acc_descr:14,acc_descr_value:15,acc_descr_multiline_value:16,section:17,taskName:18,taskData:19,$accept:0,$end:1},terminals_:{2:"error",4:"journey",6:"EOF",8:"SPACE",10:"NEWLINE",11:"title",12:"acc_title",13:"acc_title_value",14:"acc_descr",15:"acc_descr_value",16:"acc_descr_multiline_value",17:"section",18:"taskName",19:"taskData"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,2]],performAction:i(function(n,a,o,y,p,l,v){var k=l.length-1;switch(p){case 1:return l[k-1];case 2:this.$=[];break;case 3:l[k-1].push(l[k]),this.$=l[k-1];break;case 4:case 5:this.$=l[k];break;case 6:case 7:this.$=[];break;case 8:y.setDiagramTitle(l[k].substr(6)),this.$=l[k].substr(6);break;case 9:this.$=l[k].trim(),y.setAccTitle(this.$);break;case 10:case 11:this.$=l[k].trim(),y.setAccDescription(this.$);break;case 12:y.addSection(l[k].substr(8)),this.$=l[k].substr(8);break;case 13:y.addTask(l[k-1],l[k]),this.$="task";break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:s,12:c,14:r,16:d,17:u,18:f},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:15,11:s,12:c,14:r,16:d,17:u,18:f},t(e,[2,5]),t(e,[2,6]),t(e,[2,8]),{13:[1,16]},{15:[1,17]},t(e,[2,11]),t(e,[2,12]),{19:[1,18]},t(e,[2,4]),t(e,[2,9]),t(e,[2,10]),t(e,[2,13])],defaultActions:{},parseError:i(function(n,a){if(a.recoverable)this.trace(n);else{var o=new Error(n);throw o.hash=a,o}},"parseError"),parse:i(function(n){var a=this,o=[0],y=[],p=[null],l=[],v=this.table,k="",E=0,nt=0,it=0,St=2,rt=1,Mt=l.slice.call(arguments,1),b=Object.create(this.lexer),A={yy:{}};for(var Y in this.yy)Object.prototype.hasOwnProperty.call(this.yy,Y)&&(A.yy[Y]=this.yy[Y]);b.setInput(n,A.yy),A.yy.lexer=b,A.yy.parser=this,typeof b.yylloc>"u"&&(b.yylloc={});var q=b.yylloc;l.push(q);var Ct=b.options&&b.options.ranges;typeof A.yy.parseError=="function"?this.parseError=A.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function Ut(w){o.length=o.length-2*w,p.length=p.length-w,l.length=l.length-w}i(Ut,"popStack");function Et(){var w;return w=y.pop()||b.lex()||rt,typeof w!="number"&&(w instanceof Array&&(y=w,w=y.pop()),w=a.symbols_[w]||w),w}i(Et,"lex");for(var _,D,F,T,Zt,H,V={},j,M,st,W;;){if(F=o[o.length-1],this.defaultActions[F]?T=this.defaultActions[F]:((_===null||typeof _>"u")&&(_=Et()),T=v[F]&&v[F][_]),typeof T>"u"||!T.length||!T[0]){var X="";W=[];for(j in v[F])this.terminals_[j]&&j>St&&W.push("'"+this.terminals_[j]+"'");b.showPosition?X="Parse error on line "+(E+1)+`:
`+b.showPosition()+`
Expecting `+W.join(", ")+", got '"+(this.terminals_[_]||_)+"'":X="Parse error on line "+(E+1)+": Unexpected "+(_==rt?"end of input":"'"+(this.terminals_[_]||_)+"'"),this.parseError(X,{text:b.match,token:this.terminals_[_]||_,line:b.yylineno,loc:q,expected:W})}if(T[0]instanceof Array&&T.length>1)throw new Error("Parse Error: multiple actions possible at state: "+F+", token: "+_);switch(T[0]){case 1:o.push(_),p.push(b.yytext),l.push(b.yylloc),o.push(T[1]),_=null,D?(_=D,D=null):(nt=b.yyleng,k=b.yytext,E=b.yylineno,q=b.yylloc,it>0&&it--);break;case 2:if(M=this.productions_[T[1]][1],V.$=p[p.length-M],V._$={first_line:l[l.length-(M||1)].first_line,last_line:l[l.length-1].last_line,first_column:l[l.length-(M||1)].first_column,last_column:l[l.length-1].last_column},Ct&&(V._$.range=[l[l.length-(M||1)].range[0],l[l.length-1].range[1]]),H=this.performAction.apply(V,[k,nt,E,A.yy,T[1],p,l].concat(Mt)),typeof H<"u")return H;M&&(o=o.slice(0,-1*M*2),p=p.slice(0,-1*M),l=l.slice(0,-1*M)),o.push(this.productions_[T[1]][0]),p.push(V.$),l.push(V._$),st=v[o[o.length-2]][o[o.length-1]],o.push(st);break;case 3:return!0}}return!0},"parse")},m=(function(){var h={EOF:1,parseError:i(function(a,o){if(this.yy.parser)this.yy.parser.parseError(a,o);else throw new Error(a)},"parseError"),setInput:i(function(n,a){return this.yy=a||this.yy||{},this._input=n,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:i(function(){var n=this._input[0];this.yytext+=n,this.yyleng++,this.offset++,this.match+=n,this.matched+=n;var a=n.match(/(?:\r\n?|\n).*/g);return a?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),n},"input"),unput:i(function(n){var a=n.length,o=n.split(/(?:\r\n?|\n)/g);this._input=n+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-a),this.offset-=a;var y=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),o.length-1&&(this.yylineno-=o.length-1);var p=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:o?(o.length===y.length?this.yylloc.first_column:0)+y[y.length-o.length].length-o[0].length:this.yylloc.first_column-a},this.options.ranges&&(this.yylloc.range=[p[0],p[0]+this.yyleng-a]),this.yyleng=this.yytext.length,this},"unput"),more:i(function(){return this._more=!0,this},"more"),reject:i(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:i(function(n){this.unput(this.match.slice(n))},"less"),pastInput:i(function(){var n=this.matched.substr(0,this.matched.length-this.match.length);return(n.length>20?"...":"")+n.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:i(function(){var n=this.match;return n.length<20&&(n+=this._input.substr(0,20-n.length)),(n.substr(0,20)+(n.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:i(function(){var n=this.pastInput(),a=new Array(n.length+1).join("-");return n+this.upcomingInput()+`
`+a+"^"},"showPosition"),test_match:i(function(n,a){var o,y,p;if(this.options.backtrack_lexer&&(p={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(p.yylloc.range=this.yylloc.range.slice(0))),y=n[0].match(/(?:\r\n?|\n).*/g),y&&(this.yylineno+=y.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:y?y[y.length-1].length-y[y.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+n[0].length},this.yytext+=n[0],this.match+=n[0],this.matches=n,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(n[0].length),this.matched+=n[0],o=this.performAction.call(this,this.yy,this,a,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),o)return o;if(this._backtrack){for(var l in p)this[l]=p[l];return!1}return!1},"test_match"),next:i(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var n,a,o,y;this._more||(this.yytext="",this.match="");for(var p=this._currentRules(),l=0;l<p.length;l++)if(o=this._input.match(this.rules[p[l]]),o&&(!a||o[0].length>a[0].length)){if(a=o,y=l,this.options.backtrack_lexer){if(n=this.test_match(o,p[l]),n!==!1)return n;if(this._backtrack){a=!1;continue}else return!1}else if(!this.options.flex)break}return a?(n=this.test_match(a,p[y]),n!==!1?n:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:i(function(){var a=this.next();return a||this.lex()},"lex"),begin:i(function(a){this.conditionStack.push(a)},"begin"),popState:i(function(){var a=this.conditionStack.length-1;return a>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:i(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:i(function(a){return a=this.conditionStack.length-1-Math.abs(a||0),a>=0?this.conditionStack[a]:"INITIAL"},"topState"),pushState:i(function(a){this.begin(a)},"pushState"),stateStackSize:i(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:i(function(a,o,y,p){var l=p;switch(y){case 0:break;case 1:break;case 2:return 10;case 3:break;case 4:break;case 5:return 4;case 6:return 11;case 7:return this.begin("acc_title"),12;break;case 8:return this.popState(),"acc_title_value";break;case 9:return this.begin("acc_descr"),14;break;case 10:return this.popState(),"acc_descr_value";break;case 11:this.begin("acc_descr_multiline");break;case 12:this.popState();break;case 13:return"acc_descr_multiline_value";case 14:return 17;case 15:return 18;case 16:return 19;case 17:return":";case 18:return 6;case 19:return"INVALID"}},"anonymous"),rules:[/^(?:%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:#[^\n]*)/i,/^(?:journey\b)/i,/^(?:title\s[^#\n;]+)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:section\s[^#:\n;]+)/i,/^(?:[^#:\n;]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[12,13],inclusive:!1},acc_descr:{rules:[10],inclusive:!1},acc_title:{rules:[8],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,9,11,14,15,16,17,18,19],inclusive:!0}}};return h})();g.lexer=m;function x(){this.yy={}}return i(x,"Parser"),x.prototype=g,g.Parser=x,new x})();Z.parser=Z;var xt=Z;var L="",J=[],B=[],N=[],Pt=i(function(){J.length=0,B.length=0,L="",N.length=0,ot()},"clear"),It=i(function(t){L=t,J.push(t)},"addSection"),At=i(function(){return J},"getSections"),Ft=i(function(){let t=kt(),e=100,s=0;for(;!t&&s<e;)t=kt(),s++;return B.push(...N),B},"getTasks"),Vt=i(function(){let t=[];return B.forEach(s=>{s.people&&t.push(...s.people)}),[...new Set(t)].sort()},"updateActors"),Lt=i(function(t,e){let s=e.substr(1).split(":"),c=0,r=[];s.length===1?(c=Number(s[0]),r=[]):(c=Number(s[0]),r=s[1].split(","));let d=r.map(f=>f.trim()),u={section:L,type:L,people:d,task:t,score:c};N.push(u)},"addTask"),Rt=i(function(t){let e={section:L,type:L,description:t,task:t,classes:[]};B.push(e)},"addTaskOrg"),kt=i(function(){let t=i(function(s){return N[s].processed},"compileTask"),e=!0;for(let[s,c]of N.entries())t(s),e=e&&c.processed;return e},"compileTasks"),Bt=i(function(){return Vt()},"getActors"),K={getConfig:i(()=>P().journey,"getConfig"),clear:Pt,setDiagramTitle:yt,getDiagramTitle:ft,setAccTitle:lt,getAccTitle:ct,setAccDescription:ht,getAccDescription:ut,addSection:It,getSections:At,getTasks:Ft,addTask:Lt,addTaskOrg:Rt,getActors:Bt};var Nt=i(t=>`.label {
    font-family: ${t.fontFamily};
    color: ${t.textColor};
  }
  .mouth {
    stroke: #666;
  }

  line {
    stroke: ${t.textColor}
  }

  .legend {
    fill: ${t.textColor};
    font-family: ${t.fontFamily};
  }

  .label text {
    fill: #333;
  }
  .label {
    color: ${t.textColor}
  }

  .face {
    ${t.faceColor?`fill: ${t.faceColor}`:"fill: #FFF8DC"};
    stroke: #999;
  }

  .node rect,
  .node circle,
  .node ellipse,
  .node polygon,
  .node path {
    fill: ${t.mainBkg};
    stroke: ${t.nodeBorder};
    stroke-width: 1px;
  }

  .node .label {
    text-align: center;
  }
  .node.clickable {
    cursor: pointer;
  }

  .arrowheadPath {
    fill: ${t.arrowheadColor};
  }

  .edgePath .path {
    stroke: ${t.lineColor};
    stroke-width: 1.5px;
  }

  .flowchart-link {
    stroke: ${t.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${t.edgeLabelBackground};
    rect {
      opacity: 0.5;
    }
    text-align: center;
  }

  .cluster rect {
  }

  .cluster text {
    fill: ${t.titleColor};
  }

  div.mermaidTooltip {
    position: absolute;
    text-align: center;
    max-width: 200px;
    padding: 2px;
    font-family: ${t.fontFamily};
    font-size: 12px;
    background: ${t.tertiaryColor};
    border: 1px solid ${t.border2};
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
  }

  .task-type-0, .section-type-0  {
    ${t.fillType0?`fill: ${t.fillType0}`:""};
  }
  .task-type-1, .section-type-1  {
    ${t.fillType0?`fill: ${t.fillType1}`:""};
  }
  .task-type-2, .section-type-2  {
    ${t.fillType0?`fill: ${t.fillType2}`:""};
  }
  .task-type-3, .section-type-3  {
    ${t.fillType0?`fill: ${t.fillType3}`:""};
  }
  .task-type-4, .section-type-4  {
    ${t.fillType0?`fill: ${t.fillType4}`:""};
  }
  .task-type-5, .section-type-5  {
    ${t.fillType0?`fill: ${t.fillType5}`:""};
  }
  .task-type-6, .section-type-6  {
    ${t.fillType0?`fill: ${t.fillType6}`:""};
  }
  .task-type-7, .section-type-7  {
    ${t.fillType0?`fill: ${t.fillType7}`:""};
  }

  .actor-0 {
    ${t.actor0?`fill: ${t.actor0}`:""};
  }
  .actor-1 {
    ${t.actor1?`fill: ${t.actor1}`:""};
  }
  .actor-2 {
    ${t.actor2?`fill: ${t.actor2}`:""};
  }
  .actor-3 {
    ${t.actor3?`fill: ${t.actor3}`:""};
  }
  .actor-4 {
    ${t.actor4?`fill: ${t.actor4}`:""};
  }
  .actor-5 {
    ${t.actor5?`fill: ${t.actor5}`:""};
  }
  ${mt()}
`,"getStyles"),bt=Nt;var Q=i(function(t,e){return dt(t,e)},"drawRect"),jt=i(function(t,e){let c=t.append("circle").attr("cx",e.cx).attr("cy",e.cy).attr("class","face").attr("r",15).attr("stroke-width",2).attr("overflow","visible"),r=t.append("g");r.append("circle").attr("cx",e.cx-15/3).attr("cy",e.cy-15/3).attr("r",1.5).attr("stroke-width",2).attr("fill","#666").attr("stroke","#666"),r.append("circle").attr("cx",e.cx+15/3).attr("cy",e.cy-15/3).attr("r",1.5).attr("stroke-width",2).attr("fill","#666").attr("stroke","#666");function d(g){let m=G().startAngle(Math.PI/2).endAngle(3*(Math.PI/2)).innerRadius(7.5).outerRadius(6.8181818181818175);g.append("path").attr("class","mouth").attr("d",m).attr("transform","translate("+e.cx+","+(e.cy+2)+")")}i(d,"smile");function u(g){let m=G().startAngle(3*Math.PI/2).endAngle(5*(Math.PI/2)).innerRadius(7.5).outerRadius(6.8181818181818175);g.append("path").attr("class","mouth").attr("d",m).attr("transform","translate("+e.cx+","+(e.cy+7)+")")}i(u,"sad");function f(g){g.append("line").attr("class","mouth").attr("stroke",2).attr("x1",e.cx-5).attr("y1",e.cy+7).attr("x2",e.cx+5).attr("y2",e.cy+7).attr("class","mouth").attr("stroke-width","1px").attr("stroke","#666")}return i(f,"ambivalent"),e.score>3?d(r):e.score<3?u(r):f(r),c},"drawFace"),vt=i(function(t,e){let s=t.append("circle");return s.attr("cx",e.cx),s.attr("cy",e.cy),s.attr("class","actor-"+e.pos),s.attr("fill",e.fill),s.attr("stroke",e.stroke),s.attr("r",e.r),s.class!==void 0&&s.attr("class",s.class),e.title!==void 0&&s.append("title").text(e.title),s},"drawCircle"),wt=i(function(t,e){return gt(t,e)},"drawText"),Wt=i(function(t,e){function s(r,d,u,f,g){return r+","+d+" "+(r+u)+","+d+" "+(r+u)+","+(d+f-g)+" "+(r+u-g*1.2)+","+(d+f)+" "+r+","+(d+f)}i(s,"genPoints");let c=t.append("polygon");c.attr("points",s(e.x,e.y,50,20,7)),c.attr("class","labelBox"),e.y=e.y+e.labelMargin,e.x=e.x+.5*e.labelMargin,wt(t,e)},"drawLabel"),zt=i(function(t,e,s){let c=t.append("g"),r=U();r.x=e.x,r.y=e.y,r.fill=e.fill,r.width=s.width*e.taskCount+s.diagramMarginX*(e.taskCount-1),r.height=s.height,r.class="journey-section section-type-"+e.num,r.rx=3,r.ry=3,Q(c,r),Tt(s)(e.text,c,r.x,r.y,r.width,r.height,{class:"journey-section section-type-"+e.num},s,e.colour)},"drawSection"),_t=-1,Ot=i(function(t,e,s){let c=e.x+s.width/2,r=t.append("g");_t++,r.append("line").attr("id","task"+_t).attr("x1",c).attr("y1",e.y).attr("x2",c).attr("y2",450).attr("class","task-line").attr("stroke-width","1px").attr("stroke-dasharray","4 2").attr("stroke","#666"),jt(r,{cx:c,cy:300+(5-e.score)*30,score:e.score});let u=U();u.x=e.x,u.y=e.y,u.fill=e.fill,u.width=s.width,u.height=s.height,u.class="task task-type-"+e.num,u.rx=3,u.ry=3,Q(r,u);let f=e.x+14;e.people.forEach(g=>{let m=e.actors[g].color,x={cx:f,cy:e.y,r:7,fill:m,stroke:"#000",title:g,pos:e.actors[g].position};vt(r,x),f+=10}),Tt(s)(e.task,r,u.x,u.y,u.width,u.height,{class:"task"},s,e.colour)},"drawTask"),Yt=i(function(t,e){pt(t,e)},"drawBackgroundRect"),Tt=(function(){function t(r,d,u,f,g,m,x,h){let n=d.append("text").attr("x",u+g/2).attr("y",f+m/2+5).style("font-color",h).style("text-anchor","middle").text(r);c(n,x)}i(t,"byText");function e(r,d,u,f,g,m,x,h,n){let{taskFontSize:a,taskFontFamily:o}=h,y=r.split(/<br\s*\/?>/gi);for(let p=0;p<y.length;p++){let l=p*a-a*(y.length-1)/2,v=d.append("text").attr("x",u+g/2).attr("y",f).attr("fill",n).style("text-anchor","middle").style("font-size",a).style("font-family",o);v.append("tspan").attr("x",u+g/2).attr("dy",l).text(y[p]),v.attr("y",f+m/2).attr("dominant-baseline","central").attr("alignment-baseline","central"),c(v,x)}}i(e,"byTspan");function s(r,d,u,f,g,m,x,h){let n=d.append("switch"),o=n.append("foreignObject").attr("x",u).attr("y",f).attr("width",g).attr("height",m).attr("position","fixed").append("xhtml:div").style("display","table").style("height","100%").style("width","100%");o.append("div").attr("class","label").style("display","table-cell").style("text-align","center").style("vertical-align","middle").text(r),e(r,n,u,f,g,m,x,h),c(o,x)}i(s,"byFo");function c(r,d){for(let u in d)u in d&&r.attr(u,d[u])}return i(c,"_setTextAttrs"),function(r){return r.textPlacement==="fo"?s:r.textPlacement==="old"?t:e}})(),qt=i(function(t){t.append("defs").append("marker").attr("id","arrowhead").attr("refX",5).attr("refY",2).attr("markerWidth",6).attr("markerHeight",4).attr("orient","auto").append("path").attr("d","M 0,0 V 4 L6,2 Z")},"initGraphics"),R={drawRect:Q,drawCircle:vt,drawSection:zt,drawText:wt,drawLabel:Wt,drawTask:Ot,drawBackgroundRect:Yt,initGraphics:qt};var Dt=i(function(t){Object.keys(t).forEach(function(s){S[s]=t[s]})},"setConf"),C={},O=0;function Ht(t){let e=P().journey,s=e.maxLabelWidth;O=0;let c=60;Object.keys(C).forEach(r=>{let d=C[r].color,u={cx:20,cy:c,r:7,fill:d,stroke:"#000",pos:C[r].position};R.drawCircle(t,u);let f=t.append("text").attr("visibility","hidden").text(r),g=f.node().getBoundingClientRect().width;f.remove();let m=[];if(g<=s)m=[r];else{let x=r.split(" "),h="";f=t.append("text").attr("visibility","hidden"),x.forEach(n=>{let a=h?`${h} ${n}`:n;if(f.text(a),f.node().getBoundingClientRect().width>s){if(h&&m.push(h),h=n,f.text(n),f.node().getBoundingClientRect().width>s){let y="";for(let p of n)y+=p,f.text(y+"-"),f.node().getBoundingClientRect().width>s&&(m.push(y.slice(0,-1)+"-"),y=p);h=y}}else h=a}),h&&m.push(h),f.remove()}m.forEach((x,h)=>{let n={x:40,y:c+7+h*20,fill:"#666",text:x,textMargin:e.boxTextMargin??5},o=R.drawText(t,n).node().getBoundingClientRect().width;o>O&&o>e.leftMargin-o&&(O=o)}),c+=Math.max(20,m.length*20)})}i(Ht,"drawActorLegend");var S=P().journey,I=0,Xt=i(function(t,e,s,c){let r=P(),d=r.journey.titleColor,u=r.journey.titleFontSize,f=r.journey.titleFontFamily,g=r.securityLevel,m;g==="sandbox"&&(m=z("#i"+e));let x=g==="sandbox"?z(m.nodes()[0].contentDocument.body):z("body");$.init();let h=x.select("#"+e);R.initGraphics(h);let n=c.db.getTasks(),a=c.db.getDiagramTitle(),o=c.db.getActors();for(let E in C)delete C[E];let y=0;o.forEach(E=>{C[E]={color:S.actorColours[y%S.actorColours.length],position:y},y++}),Ht(h),I=S.leftMargin+O,$.insert(0,0,I,Object.keys(C).length*50),Gt(h,n,0);let p=$.getBounds();a&&h.append("text").text(a).attr("x",I).attr("font-size",u).attr("font-weight","bold").attr("y",25).attr("fill",d).attr("font-family",f);let l=p.stopy-p.starty+2*S.diagramMarginY,v=I+p.stopx+2*S.diagramMarginX;at(h,l,v,S.useMaxWidth),h.append("line").attr("x1",I).attr("y1",S.height*4).attr("x2",v-I-4).attr("y2",S.height*4).attr("stroke-width",4).attr("stroke","black").attr("marker-end","url(#arrowhead)");let k=a?70:0;h.attr("viewBox",`${p.startx} -25 ${v} ${l+k}`),h.attr("preserveAspectRatio","xMinYMin meet"),h.attr("height",l+k+25)},"draw"),$={data:{startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},verticalPos:0,sequenceItems:[],init:i(function(){this.sequenceItems=[],this.data={startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},this.verticalPos=0},"init"),updateVal:i(function(t,e,s,c){t[e]===void 0?t[e]=s:t[e]=c(s,t[e])},"updateVal"),updateBounds:i(function(t,e,s,c){let r=P().journey,d=this,u=0;function f(g){return i(function(x){u++;let h=d.sequenceItems.length-u+1;d.updateVal(x,"starty",e-h*r.boxMargin,Math.min),d.updateVal(x,"stopy",c+h*r.boxMargin,Math.max),d.updateVal($.data,"startx",t-h*r.boxMargin,Math.min),d.updateVal($.data,"stopx",s+h*r.boxMargin,Math.max),g!=="activation"&&(d.updateVal(x,"startx",t-h*r.boxMargin,Math.min),d.updateVal(x,"stopx",s+h*r.boxMargin,Math.max),d.updateVal($.data,"starty",e-h*r.boxMargin,Math.min),d.updateVal($.data,"stopy",c+h*r.boxMargin,Math.max))},"updateItemBounds")}i(f,"updateFn"),this.sequenceItems.forEach(f())},"updateBounds"),insert:i(function(t,e,s,c){let r=Math.min(t,s),d=Math.max(t,s),u=Math.min(e,c),f=Math.max(e,c);this.updateVal($.data,"startx",r,Math.min),this.updateVal($.data,"starty",u,Math.min),this.updateVal($.data,"stopx",d,Math.max),this.updateVal($.data,"stopy",f,Math.max),this.updateBounds(r,u,d,f)},"insert"),bumpVerticalPos:i(function(t){this.verticalPos=this.verticalPos+t,this.data.stopy=this.verticalPos},"bumpVerticalPos"),getVerticalPos:i(function(){return this.verticalPos},"getVerticalPos"),getBounds:i(function(){return this.data},"getBounds")},tt=S.sectionFills,$t=S.sectionColours,Gt=i(function(t,e,s){let c=P().journey,r="",d=c.height*2+c.diagramMarginY,u=s+d,f=0,g="#CCC",m="black",x=0;for(let[h,n]of e.entries()){if(r!==n.section){g=tt[f%tt.length],x=f%tt.length,m=$t[f%$t.length];let o=0,y=n.section;for(let l=h;l<e.length&&e[l].section==y;l++)o=o+1;let p={x:h*c.taskMargin+h*c.width+I,y:50,text:n.section,fill:g,num:x,colour:m,taskCount:o};R.drawSection(t,p,c),r=n.section,f++}let a=n.people.reduce((o,y)=>(C[y]&&(o[y]=C[y]),o),{});n.x=h*c.taskMargin+h*c.width+I,n.y=u,n.width=c.diagramMarginX,n.height=c.diagramMarginY,n.colour=m,n.fill=g,n.num=x,n.actors=a,R.drawTask(t,n,c),$.insert(n.x,n.y,n.x+n.width+c.taskMargin,450)}},"drawTasks"),et={setConf:Dt,draw:Xt};var be={parser:xt,db:K,renderer:et,styles:bt,init:i(t=>{et.setConf(t.journey),K.clear()},"init")};export{be as diagram};

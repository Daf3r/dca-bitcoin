// Prototipo: cielo en un shader de fragmentos (WebGL1, un triángulo, sin librerías).
// Entradas (uniforms): 5 colores del cielo (los de cielo.js), color de nube, luz del sol, posición del astro, estrellas, hora.
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
uniform vec2 R; uniform float T; uniform vec3 c0,c1,c2,c3,c4,luz,nube; uniform vec2 astro; uniform float estrellas,cobertura,esLuna;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y; float y=1.-uv.y;          // y=0 arriba, 1 horizonte
  vec3 col=mix(c0,c1,smoothstep(0.,.25,y)); col=mix(col,c2,smoothstep(.2,.5,y)); col=mix(col,c3,smoothstep(.45,.75,y)); col=mix(col,c4,smoothstep(.7,1.,y));
  vec2 d=(vec2(uv.x,1.-uv.y)-astro)*vec2(asp,1.); float r=length(d);
  col+=luz*(.16*exp(-r*4.5)+.30*exp(-r*16.))*(1.-.5*esLuna);               // halo ancho + núcleo (dispersión hacia delante)
  float disco=1.-smoothstep(.030,.034,r); col=mix(col,luz*1.15,disco);
  // nubes: fbm en dos capas que derivan con distinto ritmo; el borde que mira al astro recibe luz
  vec2 q=vec2(uv.x*asp*2.2+T*.004,y*5.5)+vec2(0.,T*.0006);
  float f=fbm(q+fbm(q*.7+T*.003)*.8); float m=smoothstep(.62-cobertura*.45,.86-cobertura*.45,f)*(1.-smoothstep(.45,.98,y));
  float f2=fbm(q+normalize(d+.0001)*vec2(1.,-1.)*.07); float borde=clamp((f-f2)*9.,0.,1.);
  vec3 cn=nube*(.78+.22*borde)+luz*.25*borde*exp(-r*2.5);
  col=mix(col,cn,m*.85);
  // estrellas con titileo
  vec2 gp=uv*vec2(asp,1.)*70.; vec2 g=floor(gp); float e=h(g); vec2 ctr=vec2(h(g+3.1),h(g+7.7)); float st=step(.93,e)*smoothstep(.16,.0,length(fract(gp)-ctr))*estrellas*(.6+.4*sin(T*1.7+e*80.))*(1.-m)*(1.-smoothstep(.0,.6,y)*0.0);
  col+=vec3(.95,.9,.8)*st;
  col+=(h(gl_FragCoord.xy+fract(T))-.5)/255.*1.5;                          // dither: rompe las bandas del degradado
  gl_FragColor=vec4(col,1.);
}`;
export function iniciar(canvas, escala = 0.5) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return {
    pintar(p, t) {
      const w = Math.round(canvas.clientWidth * escala), h = Math.round(canvas.clientHeight * escala);
      if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      p.c.forEach((c, i) => gl.uniform3fv(U('c' + i), rgb(c)));
      gl.uniform3fv(U('luz'), rgb(p.astro)); gl.uniform3fv(U('nube'), rgb(p.nube));
      gl.uniform2f(U('R'), w, h); gl.uniform1f(U('T'), t); gl.uniform2f(U('astro'), p.ax, p.ay);
      gl.uniform1f(U('estrellas'), p.estrellas); gl.uniform1f(U('cobertura'), p.cobertura); gl.uniform1f(U('esLuna'), p.luna ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

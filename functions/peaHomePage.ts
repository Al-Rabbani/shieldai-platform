// peaHomePage — Cinematic PEA home page (CDN-bypass, self-contained HTML)
// URL: https://primeendorsement.com/api/functions/peaHomePage

const H={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET,OPTIONS",
  "Content-Type":"text/html; charset=utf-8",
  "Cache-Control":"public, max-age=300"
};

const CSS=`*{box-sizing:border-box;margin:0;padding:0;scroll-behavior:smooth}
:root{--g:#C9A84C;--gd:rgba(201,168,76,0.3);--gg:rgba(201,168,76,0.15);--bg:#080d18;--bg2:#0a0f1e;--bg3:#0d1526;--br:rgba(201,168,76,0.15);--tx:#e2e8f0;--mu:#64748b;--m2:#94a3b8;--gr:#22c55e;--rd:#ef4444}
body{background:var(--bg);color:var(--tx);font-family:'Inter',sans-serif;overflow-x:hidden}
a{color:inherit;text-decoration:none}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--gd);border-radius:2px}
.nw{position:fixed;top:0;left:0;right:0;z-index:1000;backdrop-filter:blur(20px)}
.ns{background:rgba(8,13,24,.95);border-bottom:1px solid rgba(201,168,76,.08);padding:4px 0;overflow:hidden;white-space:nowrap}
.nsi{display:inline-flex;animation:ss 28s linear infinite}
.st{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.25em;color:rgba(201,168,76,.35);text-transform:uppercase;padding:0 48px}
@keyframes ss{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.nm{background:rgba(8,13,24,.92);border-bottom:1px solid var(--br);padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.nl{display:flex;align-items:center;gap:10px}
.ni{width:36px;height:36px;background:linear-gradient(135deg,var(--g),#a07c30);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#080d18}
.nt{display:flex;flex-direction:column;line-height:1.1}
.na{font-size:13px;font-weight:700;color:var(--tx)}
.nb{font-size:8px;font-weight:600;color:var(--g);letter-spacing:.35em;text-transform:uppercase}
.nv{display:flex;align-items:center;gap:2px}
.nk{padding:8px 14px;font-size:12px;font-weight:500;color:var(--m2);border-radius:4px;transition:all .2s;cursor:pointer}
.nk:hover{color:var(--g);background:var(--gg)}
.nr{display:flex;align-items:center;gap:10px;flex-shrink:0}
.bl{display:flex;align-items:center;gap:6px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:20px;padding:5px 12px;font-size:10px;font-weight:600;color:var(--gr);letter-spacing:.08em;text-transform:uppercase}
.dp{width:6px;height:6px;border-radius:50%;background:var(--gr);animation:pl 2s infinite}
@keyframes pl{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,.4)}50%{opacity:.7;box-shadow:0 0 0 4px rgba(34,197,94,0)}}
.bt{background:transparent;border:1px solid rgba(201,168,76,.4);color:var(--g);padding:7px 16px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:.1em;cursor:pointer;transition:all .2s;text-transform:uppercase;white-space:nowrap}
.bt:hover{background:var(--gg);border-color:var(--g);box-shadow:0 0 16px var(--gg)}
.ba{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.5);color:var(--g);padding:7px 16px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.1em;cursor:pointer;transition:all .2s;text-transform:uppercase;white-space:nowrap}
.ba:hover{background:rgba(201,168,76,.22);border-color:var(--g);box-shadow:0 0 20px rgba(201,168,76,.2)}
.tb{background:rgba(8,13,24,.88);border-bottom:1px solid rgba(255,255,255,.04);padding:0 24px;height:36px;display:flex;align-items:center;gap:16px;font-family:'JetBrains Mono',monospace;font-size:9.5px;overflow:hidden}
.tl{display:flex;align-items:center;gap:6px;flex-shrink:0}
.dr{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:pr 1.5s infinite}
@keyframes pr{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}
.tt{color:#ef4444;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.td{width:1px;height:16px;background:rgba(255,255,255,.1);flex-shrink:0}
.tm{color:rgba(201,168,76,.6);letter-spacing:.1em;text-transform:uppercase;font-size:9px;transition:opacity .4s;flex:1;overflow:hidden;white-space:nowrap}
.tr2{display:flex;align-items:center;gap:12px;flex-shrink:0;margin-left:auto}
.tbd{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:3px;padding:2px 8px;font-size:8px;color:rgba(201,168,76,.5);letter-spacing:.15em;text-transform:uppercase}
.ab{background:rgba(10,15,30,.9);border-bottom:1px solid rgba(201,168,76,.12);padding:10px 24px;display:flex;align-items:center;gap:12px;min-height:44px}
.als{display:flex;align-items:center;gap:5px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:3px;padding:3px 8px;font-size:9px;font-weight:700;color:#ef4444;letter-spacing:.15em;text-transform:uppercase;flex-shrink:0}
.dlv{width:5px;height:5px;border-radius:50%;background:#ef4444;animation:pr 1s infinite}
.atg{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:3px;padding:3px 8px;font-size:9px;font-weight:600;color:var(--g);letter-spacing:.12em;text-transform:uppercase;flex-shrink:0}
.ct{background:rgba(8,10,20,.95);border-bottom:1px solid rgba(201,168,76,.08);padding:8px 0;overflow:hidden;white-space:nowrap}
.cti{display:inline-flex;animation:cs 38s linear infinite}
@keyframes cs{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.ctx{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.18em;color:rgba(201,168,76,.4);text-transform:uppercase;padding:0 32px}
.hr{min-height:100vh;display:flex;align-items:center;padding-top:170px;padding-bottom:60px;position:relative;overflow:hidden}
.hb{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.hs{position:absolute;border:1px solid rgba(201,168,76,.08);border-radius:8px;transition:transform .15s ease-out}
.hs1{width:300px;height:300px;top:10%;left:5%;transform:rotate(15deg)}
.hs2{width:200px;height:200px;top:60%;left:0;transform:rotate(30deg)}
.hs3{width:180px;height:180px;top:20%;right:3%;transform:rotate(-20deg)}
.hs4{width:250px;height:250px;bottom:10%;right:8%;transform:rotate(10deg)}
.hrad{position:absolute;top:0;left:50%;transform:translateX(-50%);width:80%;height:60%;background:radial-gradient(ellipse at 50% 0%,rgba(201,168,76,.04) 0%,transparent 70%)}
.hc{max-width:1280px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;position:relative;z-index:2;width:100%}
.hbdg{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:20px;padding:6px 16px;font-size:9px;font-weight:600;color:rgba(201,168,76,.7);letter-spacing:.2em;text-transform:uppercase;margin-bottom:28px}
.bdot{width:5px;height:5px;border-radius:50%;background:var(--gr);animation:pl 2s infinite}
.hh{margin-bottom:12px;line-height:1.05}
.hw{display:inline-block;font-size:clamp(52px,6vw,80px);font-weight:800;letter-spacing:-.02em;opacity:0;transform:translateY(40px);animation:wi .7s forwards}
.hw.gd{color:var(--g)}.hw.wh{color:#f1f5f9}
.hw:nth-child(1){animation-delay:.15s}.hw:nth-child(2){animation-delay:.3s}.hw:nth-child(3){animation-delay:.45s}
@keyframes wi{to{opacity:1;transform:translateY(0)}}
.hsl{font-size:10px;font-weight:600;color:rgba(201,168,76,.6);letter-spacing:.35em;text-transform:uppercase;margin-bottom:20px;font-family:'JetBrains Mono',monospace}
.hd{font-size:14px;line-height:1.7;color:var(--m2);margin-bottom:10px;max-width:480px}
.hdi{font-size:11px;line-height:1.6;color:rgba(100,116,139,.6);margin-bottom:28px;max-width:480px;padding:12px;background:rgba(255,255,255,.02);border-left:2px solid rgba(201,168,76,.15);border-radius:0 4px 4px 0}
.hca{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap}
.cp{background:var(--g);color:#080d18;padding:13px 28px;border-radius:5px;font-size:13px;font-weight:700;letter-spacing:.08em;cursor:pointer;transition:all .2s;border:none;text-transform:uppercase;display:inline-block}
.cp:hover{background:#d4a93c;box-shadow:0 0 28px rgba(201,168,76,.35);transform:translateY(-2px)}
.cg{background:transparent;border:1px solid rgba(201,168,76,.35);color:var(--g);padding:13px 28px;border-radius:5px;font-size:13px;font-weight:600;letter-spacing:.08em;cursor:pointer;transition:all .2s;text-transform:uppercase;display:inline-block}
.cg:hover{background:var(--gg);border-color:var(--g)}
.htr{display:flex;gap:12px;flex-wrap:wrap}
.trb{display:flex;flex-direction:column;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:8px 14px;gap:2px}
.trt{font-size:10px;font-weight:600;color:var(--tx)}
.trs{font-size:9px;color:var(--mu);letter-spacing:.04em}
.dc{background:rgba(13,21,38,.95);border:1px solid rgba(201,168,76,.2);border-radius:10px;width:100%;max-width:520px;box-shadow:0 0 60px rgba(201,168,76,.08),0 24px 64px rgba(0,0,0,.5);animation:fc 6s ease-in-out infinite;overflow:hidden}
@keyframes fc{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.dtb{background:rgba(8,13,24,.8);border-bottom:1px solid rgba(255,255,255,.05);padding:10px 14px;display:flex;align-items:center;gap:10px}
.dts{display:flex;gap:5px}
.dtd{width:10px;height:10px;border-radius:50%}
.du{flex:1;background:rgba(255,255,255,.04);border-radius:4px;padding:4px 10px;font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(226,232,240,.4);text-align:center}
.dlb{display:flex;align-items:center;gap:4px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:3px;padding:2px 8px;font-size:8px;font-weight:700;color:#22c55e;letter-spacing:.15em}
.dtt{display:flex;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(8,13,24,.5)}
.dta{padding:10px 18px;font-size:10px;font-weight:600;color:var(--mu);letter-spacing:.1em;cursor:pointer;transition:all .2s;border-bottom:2px solid transparent;text-transform:uppercase}
.dta.ac{color:var(--g);border-bottom-color:var(--g)}
.db{padding:14px}
.dlh{display:flex;align-items:center;gap:6px;margin-bottom:12px;font-family:'JetBrains Mono',monospace;font-size:9px}
.ld{width:5px;height:5px;border-radius:50%;background:#22c55e;animation:pl 1.5s infinite}
.ll{color:#22c55e;letter-spacing:.1em;text-transform:uppercase;font-weight:700}
.lv{color:var(--mu)}
.dss{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.dsc{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:6px;padding:10px 8px;text-align:center}
.dsv{font-size:18px;font-weight:700;color:var(--g);display:block;line-height:1.1}
.dsl{font-size:7px;color:var(--mu);letter-spacing:.15em;text-transform:uppercase;margin-top:3px;display:block}
.fh{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.ft{font-size:8px;font-weight:600;color:var(--mu);letter-spacing:.2em;text-transform:uppercase}
.fr{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.fr:last-child{border-bottom:none}
.sc{width:30px;height:30px;border-radius:50%;background:rgba(201,168,76,.1);border:1.5px solid rgba(201,168,76,.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--g);flex-shrink:0}
.fi{flex:1;min-width:0}
.fn{font-size:11px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fm{font-size:9px;color:var(--mu)}
.sb{padding:2px 8px;border-radius:3px;font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.se{background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.2)}
.sr{background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.2)}
.df{background:rgba(8,13,24,.6);border-top:1px solid rgba(255,255,255,.05);padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(201,168,76,.35);letter-spacing:.12em;text-transform:uppercase}
.ss2{background:var(--bg2);border-top:1px solid var(--br);border-bottom:1px solid var(--br);padding:48px 24px}
.sg{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:28px}
.si{text-align:center;padding:24px 16px;background:rgba(255,255,255,.01);border:1px solid rgba(255,255,255,.04);border-radius:8px;transition:all .3s}
.si:hover{border-color:var(--br);background:var(--gg)}
.sn{font-size:42px;font-weight:800;color:var(--g);line-height:1;display:block}
.sf{font-size:24px;color:rgba(201,168,76,.6)}
.sl{font-size:9px;font-weight:600;color:var(--mu);letter-spacing:.2em;text-transform:uppercase;margin-top:8px;display:block}
.su{font-size:9px;color:rgba(100,116,139,.5);text-transform:uppercase;display:block;margin-top:2px}
.syb{max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.syc{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:4px;padding:6px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.syd{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.sydg{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.4)}
.sydgo{background:var(--g);box-shadow:0 0 6px rgba(201,168,76,.4)}
.sec{padding:80px 24px}
.sei{max-width:1280px;margin:0 auto}
.ey{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:var(--g);letter-spacing:.35em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.ey::before{content:'';display:inline-block;width:3px;height:14px;background:var(--g);border-radius:2px;flex-shrink:0}
.sh{font-size:clamp(28px,4vw,44px);font-weight:700;color:var(--tx);margin-bottom:12px;line-height:1.15;letter-spacing:-.02em}
.sp{font-size:14px;color:var(--m2);max-width:600px;line-height:1.7;margin-bottom:48px}
.ms{background:var(--bg3);padding:64px 24px}
.mg{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px}
.ml{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:24px}
.mi{display:flex;align-items:flex-start;gap:8px;padding:8px 0}
.mc{color:var(--g);font-size:12px;flex-shrink:0;margin-top:1px}
.mx{font-size:12px;color:var(--m2);line-height:1.5}
.hc2{background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.12);border-radius:8px;padding:20px;margin-bottom:16px;transition:all .3s}
.hc2:hover{background:rgba(201,168,76,.07);border-color:rgba(201,168,76,.25);transform:translateX(4px)}
.ht{font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
.hd2{font-size:12px;color:var(--mu);line-height:1.6}
.cg2{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.cc{background:var(--bg3);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:24px;cursor:pointer;transition:all .3s;position:relative;overflow:hidden}
.cc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.cc.bl2::before{background:linear-gradient(90deg,#3b82f6,transparent)}
.cc.em::before{background:linear-gradient(90deg,#10b981,transparent)}
.cc.go::before{background:linear-gradient(90deg,var(--g),transparent)}
.cc.pu::before{background:linear-gradient(90deg,#a855f7,transparent)}
.cc.ro::before{background:linear-gradient(90deg,#f43f5e,transparent)}
.cc.am::before{background:linear-gradient(90deg,#f59e0b,transparent)}
.cc:hover,.cc.ex{border-color:rgba(201,168,76,.2);background:rgba(13,21,38,.8);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.3)}
.cn{position:absolute;top:16px;right:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.08);font-weight:700}
.ci{font-size:24px;margin-bottom:14px}
.ctl{font-size:14px;font-weight:600;color:var(--tx);margin-bottom:8px}
.cs{font-size:12px;color:var(--m2);line-height:1.6}
.cd{font-size:12px;color:var(--mu);line-height:1.7;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05);display:none}
.cc.ex .cd{display:block}
.cbg{display:inline-flex;margin-top:12px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:3px;padding:3px 8px;font-size:8px;font-weight:600;color:rgba(34,197,94,.7);letter-spacing:.12em;text-transform:uppercase}
.ceh{font-size:9px;color:rgba(201,168,76,.4);margin-top:10px;letter-spacing:.1em;text-transform:uppercase}
.rts{display:flex;gap:4px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:32px}
.rtb{padding:12px 24px;font-size:12px;font-weight:600;color:var(--mu);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s;letter-spacing:.05em;text-transform:uppercase}
.rtb.ac{color:var(--g);border-bottom-color:var(--g)}
.rc{display:none;grid-template-columns:repeat(2,1fr);gap:16px;animation:fi2 .3s ease}
.rc.ac{display:grid}
@keyframes fi2{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.rf{background:var(--bg3);border:1px solid rgba(255,255,255,.05);border-radius:8px;padding:20px;display:flex;gap:14px;transition:all .3s}
.rf:hover{border-color:rgba(201,168,76,.2);transform:translateY(-2px)}
.rn{width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--g);flex-shrink:0}
.rtl{font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
.rde{font-size:12px;color:var(--mu);line-height:1.6}
.ps{background:var(--bg2);padding:80px 24px}
.pl2{max-width:860px;margin:0 auto;position:relative}
.pln{position:absolute;left:19px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,var(--g),rgba(201,168,76,.1));border-radius:2px}
.pi2{display:flex;gap:24px;margin-bottom:4px;position:relative}
.pc{width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,.1);border:2px solid rgba(201,168,76,.4);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--g);flex-shrink:0;cursor:pointer;transition:all .3s;z-index:1}
.pi2.op .pc{background:rgba(201,168,76,.2);border-color:var(--g);box-shadow:0 0 20px rgba(201,168,76,.2)}
.pb{flex:1;background:rgba(255,255,255,.01);border:1px solid rgba(255,255,255,.04);border-radius:8px;padding:18px;margin-bottom:8px;cursor:pointer;transition:all .3s}
.pb:hover,.pi2.op .pb{border-color:rgba(201,168,76,.18);background:rgba(13,21,38,.6)}
.ph{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pst{font-size:13px;font-weight:600;color:var(--tx)}
.ptm{font-size:10px;color:var(--g);background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.15);border-radius:3px;padding:2px 8px;letter-spacing:.08em;flex-shrink:0}
.pds{font-size:12px;color:var(--m2);margin-top:6px;line-height:1.6}
.pe{display:none;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05)}
.pi2.op .pe{display:block}
.pdt{font-size:12px;color:var(--mu);line-height:1.7;margin-bottom:8px}
.phl{display:flex;align-items:flex-start;gap:8px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.12);border-radius:4px;padding:10px;font-size:11px;font-weight:500;color:rgba(201,168,76,.8)}
.pch{font-size:12px;color:rgba(201,168,76,.4);transition:transform .3s;flex-shrink:0}
.pi2.op .pch{transform:rotate(180deg)}
.pf{text-align:center;margin-top:32px;padding:16px;background:rgba(201,168,76,.03);border:1px solid rgba(201,168,76,.1);border-radius:6px;font-size:12px;color:var(--mu);line-height:1.6}
.fc2{max-width:560px;margin:0 auto;background:var(--bg3);border:1px solid rgba(201,168,76,.25);border-radius:12px;padding:48px;text-align:center;box-shadow:0 0 60px rgba(201,168,76,.06)}
.fa{font-size:64px;font-weight:800;color:var(--g);line-height:1;margin-bottom:6px}
.fb{font-size:13px;color:var(--mu);margin-bottom:32px}
.ff{list-style:none;text-align:left;margin-bottom:32px;display:flex;flex-direction:column;gap:10px}
.fi2{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--m2)}
.fck{color:var(--g)}
.qa{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:6px}
.qi{background:var(--bg3);border:1px solid rgba(255,255,255,.05);border-radius:6px;overflow:hidden;transition:border-color .3s}
.qi.op{border-color:rgba(201,168,76,.2)}
.qq{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;cursor:pointer;gap:16px}
.qt{font-size:14px;font-weight:500;color:var(--tx)}
.qi2{width:24px;height:24px;border-radius:50%;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--g);flex-shrink:0;transition:transform .3s}
.qi.op .qi2{transform:rotate(45deg)}
.qa2{font-size:13px;color:var(--m2);line-height:1.8;padding:0 20px 18px;display:none}
.qi.op .qa2{display:block}
.cs2{padding:80px 24px;background:linear-gradient(135deg,var(--bg) 0%,rgba(201,168,76,.03) 50%,var(--bg) 100%);border-top:1px solid var(--br);text-align:center}
.ch{font-size:clamp(28px,4vw,44px);font-weight:700;color:var(--tx);margin-bottom:14px;line-height:1.2;letter-spacing:-.02em}
.csb{font-size:15px;color:var(--m2);margin-bottom:36px;line-height:1.7}
.cbs{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.fo{background:rgba(5,8,15,.98);border-top:1px solid rgba(201,168,76,.15);padding:56px 24px 28px}
.fg{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
.fc3{font-size:9px;font-weight:600;color:rgba(201,168,76,.5);letter-spacing:.25em;text-transform:uppercase;margin-bottom:16px;font-family:'JetBrains Mono',monospace}
.fls{display:flex;flex-direction:column;gap:10px}
.flk{font-size:13px;color:var(--mu);transition:color .2s}
.flk:hover{color:var(--g)}
.ftg{font-size:12px;color:var(--mu);line-height:1.7;max-width:260px;margin:14px 0 16px}
.fcm{display:flex;flex-wrap:wrap;gap:6px}
.fbg{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:3px;padding:3px 8px;font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(201,168,76,.4);letter-spacing:.15em;text-transform:uppercase}
.fbt{max-width:1280px;margin:0 auto;border-top:1px solid rgba(255,255,255,.04);padding-top:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.fcp{font-size:11px;color:rgba(100,116,139,.5)}
.rv{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease}
.rv.vi{opacity:1;transform:translateY(0)}
.rv1{transition-delay:.1s}.rv2{transition-delay:.2s}.rv3{transition-delay:.3s}
@media(max-width:900px){.hc{grid-template-columns:1fr}.hero-right{display:none}.sg{grid-template-columns:repeat(2,1fr)}.cg2{grid-template-columns:repeat(2,1fr)}.mg{grid-template-columns:1fr}.fg{grid-template-columns:1fr 1fr}.rc.ac{grid-template-columns:1fr}}
@media(max-width:600px){.nv{display:none}.bl{display:none}.sg{grid-template-columns:1fr 1fr}.cg2{grid-template-columns:1fr}.fg{grid-template-columns:1fr}.cbs{flex-direction:column;align-items:center}}`;

const STAGES=[
  ["Administrator Sends Invitation","Day 0","Administrators create applicant profiles and dispatch secure onboarding invitations.","All registrations are initiated exclusively by the Prime Endorsement Authority. Applicants receive a secure, personalised registration link, ensuring full quality control from the first point of contact.","Administrator-controlled intake with invitation-only access."],
  ["Applicant Completes Registration","Day 1","Invited applicants activate their secure portal and commence their application.","Upon receiving the invitation, applicants activate their secure account and proceed through a structured onboarding process covering: founder profile, venture details, innovation case, market opportunity, financial outlook and strategic vision.","Structured onboarding with guided section completion throughout."],
  ["Document Submission and Verification","Day 1 to 2","Upload supporting documents for structured review and cross-validation.","Applicants upload pitch decks, business plans, financial models and identity documents. Each submission is reviewed for completeness, cross-referenced for consistency and logged within the secure document vault.","Full document review and structured completeness validation upon submission."],
  ["Structured Assessment and Scoring","Day 2 to 5","Applications are assessed and scored across five core evaluation dimensions.","Each application is evaluated for innovation depth, market opportunity, team capability, financial viability and global impact. The preliminary assessment score guides the expert review panel and identifies areas requiring enhanced due diligence.","Scored across Innovation, Viability, Team, Market and Global Impact."],
  ["Programme Activation","Day 5","Formal programme activation initiates full reviewer access and the structured assessment workflow.","Upon programme activation, an automated workflow is initiated: documents enter the secure review vault, reviewer assignment commences and the applicant receives real-time status updates.","Structured workflow activation upon programme confirmation."],
  ["Expert Multi-Reviewer Panel","Day 5–60","2–3 independent experts evaluate across a structured 5-dimension rubric.","Assigned expert reviewers apply a rigorous scoring rubric. The Administrator Command Centre monitors progress in real time. COI protocols operate automatically. Discrepancies trigger a calibration review with binding adjudication.","Mandatory conflict-of-interest screening enforced across all reviewer assignments."],
  ["Decision & Certificate Issuance","Day 60–90","Final decision communicated. Official QR-verified certificate generated instantly.","The lead reviewer finalises the decision with full documentation. Approved applicants instantly receive a PDF endorsement certificate with cryptographic QR verification. Every action is logged to an immutable audit trail.","QR-verified endorsement certificate, immediately recognised by UKVI."],
  ["Post-Endorsement Business Journey","Ongoing","Investor network, advisory ecosystem and structured milestone tracking, permanently active.","Endorsed founders join our exclusive post-endorsement ecosystem: investor directory access, monthly advisory office hours, peer mentorship and structured milestone tracking. The Administration team monitors portfolio performance through dedicated oversight dashboards.","Lifetime access to the Prime Endorsement Authority post-endorsement ecosystem."]
];

const CAPS=[
  ["bl2","⚡","Assessment Framework","01","Applications evaluated across five core dimensions by assigned reviewers.","Our structured assessment framework evaluates innovation depth, market opportunity, team strength, financial viability and global impact. Documents are cross-referenced for completeness and consistency before any reviewer engages with the application."],
  ["em","📡","Live Status Intelligence","02","Every action and status change propagates instantly across all portals.","Administrator and member dashboards reflect live data at all times. Status changes, reviewer assignments, payment confirmations and notifications are reflected immediately, with no page refresh required."],
  ["go","🛡️","Zero-Trust Security Architecture","03","AES-256 encryption, FIPS 140-2 compliance and forensic audit on every layer.","Military-grade encryption at rest and in transit. Every access event is logged to an immutable audit trail. HMAC signature chains validate document authenticity. Role-based access controls with automatic session revocation on anomaly detection."],
  ["pu","🔒","Secure Document Vault","04","Encrypted document storage with authenticity verification on upload.","Documents are encrypted with AES-256. Each upload is reviewed for authenticity, with structured data extracted and any inconsistencies flagged. Only assigned reviewers can access documents, and every view is logged forensically."],
  ["ro","🌐","Investor Intelligence Network","05","Endorsed founders connect with vetted angels, family offices and institutional VCs.","Approved founders opt into an anonymised investor-facing directory. Vetted investors browse profiles and request introductions via the matching engine. All connections are founder-controlled with administrator oversight."],
  ["am","📊","Executive Analytics Suite","06","Portfolio compliance intelligence and performance metrics at a glance.","The Command Centre provides real-time executive analytics covering application pipeline health, reviewer turnaround metrics, conflict-of-interest monitoring, sector concentration analysis, geographic distribution and decision outcome metrics."]
];

const FAQS=[
  ["What is the UK Innovator Founder visa?","The UK Innovator Founder visa is a route for global entrepreneurs seeking to establish an innovative business in the United Kingdom. Endorsement from an approved endorsing body is a mandatory prerequisite. Prime Endorsement Authority provides the technology infrastructure and compliance framework for that assessment process."],
  ["How does Prime Endorsement Authority work?","We provide the technology infrastructure, structured assessment framework and compliance systems used by Home Office Approved Endorsement Bodies. All registrations are administrator-initiated. Applicants receive a personalised, secure invitation to complete their application through the encrypted member portal."],
  ["Who can register? Can anyone apply directly?","All registrations are initiated exclusively by the Prime Endorsement Authority administration team. No self-registration is permitted. Applicants receive a secure cryptographically-signed invitation link. This ensures quality control from the first step."],
  ["How does the initial assessment process work?","Applications are evaluated across five innovation dimensions. Uploaded documents are reviewed for completeness and cross-referenced for consistency. An advisory assessment score is generated to guide the expert review panel and identify areas requiring closer examination."],
  ["How long does the endorsement process take?","The full process takes up to 90 days from registration activation to final decision. Stages 1 to 4 (registration through initial assessment): 5 days. Stage 5 (programme activation): 1 day. Stage 6 (expert panel review): 55 days. Stage 7 (decision): up to 30 days following panel completion."],
  ["Is my personal data and documentation secure?","All data is encrypted with AES-256-GCM at rest and in transit. Documents are stored in an encrypted vault. All access is logged to an immutable forensic audit trail. We are ISO 27001 aligned and FIPS 140-2 compliant. Only assigned reviewers can access your documents."],
  ["What happens after endorsement is granted?","Endorsed founders receive a QR-verified PDF certificate immediately. You gain access to our investor intelligence directory, monthly advisory office hours, peer mentorship programme and structured milestone tracking. All post-endorsement benefits remain permanently active."]
];

function buildHTML():string{
  const stagesHTML=STAGES.map(([stage,time,desc,detail,hl],i)=>`
<div class="pi2 rv" id="proc-${i}">
  <div class="pc" onclick="tp(${i})">${i+1}</div>
  <div class="pb" onclick="tp(${i})">
    <div class="ph"><span class="pst">${stage}</span><div style="display:flex;align-items:center;gap:8px"><span class="ptm">${time}</span><span class="pch">▼</span></div></div>
    <div class="pds">${desc}</div>
    <div class="pe"><div class="pdt">${detail}</div><div class="phl">✦ ${hl}</div></div>
  </div>
</div>`).join("");

  const capsHTML=CAPS.map(([color,icon,title,num,summary,detail])=>`
<div class="cc ${color} rv" onclick="tcc(this)">
  <div class="cn">${num}</div><div class="ci">${icon}</div>
  <div class="ctl">${title}</div><div class="cs">${summary}</div>
  <div class="cd">${detail}</div>
  <div class="cbg">● MODULE ACTIVE · OPERATIONAL · ${num}</div>
  <div class="ceh">Click to expand ▼</div>
</div>`).join("");

  const faqsHTML=FAQS.map(([q,a],i)=>`
<div class="qi" id="faq-${i}">
  <div class="qq" onclick="tf(${i})"><span class="qt">${q}</span><div class="qi2">+</div></div>
  <div class="qa2">${a}</div>
</div>`).join("");

  return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Prime Endorsement Authority | Global Digital Endorsement Infrastructure</title>
<meta name="description" content="Institutional endorsement infrastructure for the UK Innovator Founder Visa ecosystem. Invitation-only. Professionally administered. Globally recognised."/>
<meta property="og:title" content="Prime Endorsement Authority"/>
<meta property="og:description" content="Institutional infrastructure for global innovation endorsement."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>${CSS}</style>
</head>
<body>

<!-- NAV -->
<div class="nw">
  <div class="ns"><div class="nsi"><span class="st">AES-256-GCM · TLS 1.3 · ZERO-TRUST · FIPS 140-2 · ISO 27001 · HMAC-SHA3 · PKI INFRASTRUCTURE · SOVEREIGN PLATFORM</span><span class="st">AES-256-GCM · TLS 1.3 · ZERO-TRUST · FIPS 140-2 · ISO 27001 · HMAC-SHA3 · PKI INFRASTRUCTURE · SOVEREIGN PLATFORM</span></div></div>
  <div class="nm">
    <a class="nl" href="/api/functions/peaHomePage"><div class="ni">P</div><div class="nt"><span class="na">Prime Endorsement</span><span class="nb">Authority</span></div></a>
    <nav class="nv">
      <a class="nk" href="/api/functions/peaHomePage">Home</a>
      <a class="nk" href="#how-it-works">How It Works</a>
      <a class="nk" href="#how-it-works">The Process</a>
      <a class="nk" href="#faq">Contact</a>
    </nav>
    <div class="nr">
      <div class="bl"><div class="dp"></div>SECURE · LIVE</div>
      <a href="/api/functions/peaStatusPage" target="_self"><button class="bt">Track Application</button></a>
      <a href="/admin-login"><button class="ba">Admin Login</button></a>
    </div>
  </div>
  <div class="tb">
    <div class="tl"><div class="dr"></div><span class="tt">THREAT: MINIMAL</span></div>
    <div class="td"></div>
    <span class="tm" id="tmsg">Assessment Framework · v3.2 · All review dimensions operational</span>
    <div class="tr2"><span class="tbd">ISO 27001</span><span class="tbd">ENCRYPTED</span><span id="clk" style="color:rgba(201,168,76,.45);letter-spacing:.12em;font-size:9px;font-family:'JetBrains Mono',monospace">00:00:00 UTC</span></div>
  </div>
</div>
<div style="height:132px"></div>

<!-- ANNOUNCEMENT -->
<div class="ab">
  <div class="als"><div class="dlv"></div>LIVE</div>
  <div class="atg" id="atg">MILESTONE</div>
  <span id="atx" style="flex:1;font-size:12px;color:rgba(226,232,240,.75);transition:opacity .4s">Prime Endorsement Authority surpasses 180+ endorsed founders from 42 countries across the UK innovation ecosystem.</span>
  <span id="adt" style="font-size:10px;color:var(--mu);flex-shrink:0;margin-left:auto">Apr 2026</span>
  <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
    <span class="ann-dot" id="ad0" style="width:5px;height:5px;border-radius:50%;display:inline-block;background:var(--g)"></span>
    <span class="ann-dot" id="ad1" style="width:5px;height:5px;border-radius:50%;display:inline-block;background:rgba(201,168,76,.25)"></span>
    <span class="ann-dot" id="ad2" style="width:5px;height:5px;border-radius:50%;display:inline-block;background:rgba(201,168,76,.25)"></span>
  </div>
</div>

<!-- COMPLIANCE TICKER -->
<div class="ct"><div class="cti"><span class="ctx">✦ HOME OFFICE APPROVED ENDORSEMENT PARTNER ✦ AES-256 ENCRYPTION ACTIVE ✦ REAL-TIME MULTI-REVIEWER PANEL PROCESSING ✦ FORENSIC AUDIT TRAIL: 100% INTEGRITY ✦ ZERO-TOLERANCE COI PROTOCOLS ENFORCED ✦ UKVI CERTIFICATE REGISTRY: FULLY SYNCED ✦ TLS 1.3 · FIPS 140-2 · ISO 27001 STANDARDS ✦ GLOBAL FOUNDERS · UK INNOVATION PATHWAY ✦</span><span class="ctx">✦ HOME OFFICE APPROVED ENDORSEMENT PARTNER ✦ AES-256 ENCRYPTION ACTIVE ✦ REAL-TIME MULTI-REVIEWER PANEL PROCESSING ✦ FORENSIC AUDIT TRAIL: 100% INTEGRITY ✦ ZERO-TOLERANCE COI PROTOCOLS ENFORCED ✦ UKVI CERTIFICATE REGISTRY: FULLY SYNCED ✦ TLS 1.3 · FIPS 140-2 · ISO 27001 STANDARDS ✦ GLOBAL FOUNDERS · UK INNOVATION PATHWAY ✦</span></div></div>

<!-- HERO -->
<section class="hr" id="hero-section">
  <div class="hb">
    <div class="hrad"></div>
    <div class="hs hs1" id="s1"></div><div class="hs hs2" id="s2"></div><div class="hs hs3" id="s3"></div><div class="hs hs4" id="s4"></div>
  </div>
  <div class="hc">
    <div>
      <div class="hbdg"><div class="bdot"></div>INVITATION-ONLY · HOME OFFICE APPROVED PARTNER · UKVI ALIGNED · ● LIVE</div>
      <div class="hh">
        <div><span class="hw wh">Prime</span></div>
        <div><span class="hw wh">Endorsement</span></div>
        <div><span class="hw gd">Authority</span></div>
      </div>
      <div class="hsl">Institutional Digital Endorsement Infrastructure</div>
      <p class="hd">A proprietary digital endorsement infrastructure platform designed to support the UK innovation and business endorsement ecosystem through advanced technology, compliance automation, secure digital workflows, and institutional-grade assessment support systems.</p>
      <p class="hdi">Prime Endorsement Authority is not a UK Home Office Approved Endorsing Body. We provide advanced technology infrastructure, compliance systems, and institutional workflow support to officially designated Home Office Approved Endorsing Bodies and regulated partner institutions.</p>
      <div class="hca">
        <a href="/api/functions/peaStatusPage" target="_self"><button class="cp">Track My Application →</button></a>
        <a href="mailto:admin@primeendorsement.com"><button class="cg">Contact Us</button></a>
      </div>
      <div class="htr">
        <div class="trb"><span class="trt">🏛 Home Office Approved</span><span class="trs">Fully accredited · UKVI aligned</span></div>
        <div class="trb"><span class="trt">🔐 AES-256 Encrypted</span><span class="trs">Military-grade cryptography</span></div>
        <div class="trb"><span class="trt">⚡ Assessment Engine v3.2</span><span class="trs">94% precision · Real-time</span></div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center">
      <div class="dc">
        <div class="dtb">
          <div class="dts"><div class="dtd" style="background:#ef4444"></div><div class="dtd" style="background:#f59e0b"></div><div class="dtd" style="background:#22c55e"></div></div>
          <div class="du">🔒 app.primeendorsement.co <span style="color:rgba(34,197,94,.7)">Secure</span></div>
          <div class="dlb"><div class="ld"></div>LIVE</div>
        </div>
        <div class="dtt">
          <div class="dta ac" onclick="sdt('command',this)">⚡ Command</div>
          <div class="dta" onclick="sdt('founder',this)">👤 Founder</div>
          <div class="dta" onclick="sdt('investor',this)">📈 Investor</div>
        </div>
        <div class="db">
          <div id="dt-command">
            <div class="dlh"><div class="ld"></div><span class="ll">LIVE</span><span class="lv" id="lv">· Milestone verified · TechNova Ltd ·</span></div>
            <div class="dss">
              <div class="dsc"><span class="dsv">184</span><span class="dsl">Founders</span></div>
              <div class="dsc"><span class="dsv">94%</span><span class="dsl">Score Avg</span></div>
              <div class="dsc"><span class="dsv">68%</span><span class="dsl">Endorsed</span></div>
              <div class="dsc"><span class="dsv">12</span><span class="dsl">In Review</span></div>
            </div>
            <div class="fh"><span class="ft">Live Application Feed</span><span style="font-size:8px;color:rgba(34,197,94,.6)">● real-time</span></div>
            <div class="fr"><div class="sc">87</div><div class="fi"><div class="fn">QuantumPay Solutions</div><div class="fm">PEA-2026-0182 · FinTech</div></div><div class="sb se">Endorsed</div></div>
            <div class="fr"><div class="sc">91</div><div class="fi"><div class="fn">BioSynth Diagnostics</div><div class="fm">PEA-2026-0179 · HealthTech</div></div><div class="sb sr">In Review</div></div>
            <div class="fr"><div class="sc">79</div><div class="fi"><div class="fn">GreenGrid Systems</div><div class="fm">PEA-2026-0175 · ClimaTech</div></div><div class="sb se">Endorsed</div></div>
            <div class="fr"><div class="sc">94</div><div class="fi"><div class="fn">NeuralEdge Systems</div><div class="fm">PEA-2026-0171 · DeepTech</div></div><div class="sb sr">In Review</div></div>
          </div>
          <div id="dt-founder" style="display:none">
            <div class="dlh"><div class="ld"></div><span class="ll">FOUNDER PORTAL</span><span class="lv">· Active Session</span></div>
            <div style="margin-bottom:12px"><div style="font-size:10px;color:var(--mu);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">90-Day Progress</div><div style="background:rgba(255,255,255,.04);border-radius:4px;height:8px;overflow:hidden"><div style="background:linear-gradient(90deg,var(--g),rgba(201,168,76,.4));height:100%;width:68%;border-radius:4px"></div></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:9px;color:var(--mu)"><span>Day 1</span><span>Day 61 / 90</span><span>Day 90</span></div></div>
            <div class="dss" style="grid-template-columns:repeat(3,1fr)"><div class="dsc"><span class="dsv" style="font-size:13px">Review</span><span class="dsl">Status</span></div><div class="dsc"><span class="dsv" style="font-size:13px">Active</span><span class="dsl">Status</span></div><div class="dsc"><span class="dsv" style="font-size:13px">Day 61</span><span class="dsl">Progress</span></div></div>
            <div style="font-size:11px;color:var(--mu);padding:10px;background:rgba(201,168,76,.03);border:1px solid rgba(201,168,76,.1);border-radius:4px">Expert review panel assigned. Expected decision: Day 85–90. Documents verified ✓</div>
          </div>
          <div id="dt-investor" style="display:none">
            <div class="dlh"><div class="ld"></div><span class="ll">INVESTOR VIEW</span><span class="lv">· Verified Access</span></div>
            <div class="dss"><div class="dsc"><span class="dsv">184</span><span class="dsl">Portfolio</span></div><div class="dsc"><span class="dsv">68%</span><span class="dsl">Endorsed</span></div><div class="dsc"><span class="dsv">42+</span><span class="dsl">Countries</span></div><div class="dsc"><span class="dsv">8</span><span class="dsl">Sectors</span></div></div>
            <div class="fh"><span class="ft">Top Sectors</span></div>
            <div class="fr"><span style="font-size:11px;color:var(--tx);flex:1">FinTech</span><span style="font-size:11px;color:var(--g)">32%</span></div>
            <div class="fr"><span style="font-size:11px;color:var(--tx);flex:1">HealthTech</span><span style="font-size:11px;color:var(--g)">24%</span></div>
            <div class="fr" style="border-bottom:none"><span style="font-size:11px;color:var(--tx);flex:1">DeepTech</span><span style="font-size:11px;color:var(--g)">19%</span></div>
          </div>
        </div>
        <div class="df">🔒 AES-256 · TLS 1.3 · FIPS 140-2 &nbsp;·&nbsp; All systems operational</div>
      </div>
    </div>
  </div>
</section>

<!-- STATS -->
<div class="ss2">
  <div class="sg">
    <div class="si rv"><span class="sn"><span class="cu" data-t="2000">0</span><span class="sf">+</span></span><span class="sl">Founders Supported</span><span class="su">Across 42 Countries</span></div>
    <div class="si rv rv1"><span class="sn"><span class="cu" data-t="90">0</span></span><span class="sl">Day Decision Timeline</span><span class="su">End-to-End</span></div>
    <div class="si rv rv2"><span class="sn"><span class="cu" data-t="94">0</span><span class="sf">%</span></span><span class="sl">Endorsement Success Rate</span><span class="su">Among Submitted Cases</span></div>
    <div class="si rv rv3"><span class="sn"><span class="cu" data-t="94">0</span><span class="sf">%</span></span><span class="sl">Assessment Precision</span><span class="su">Reviewer Accuracy Rating</span></div>
  </div>
  <div class="syb">
    ${[["AES-256","ACTIVE"],["TLS 1.3","SECURE"],["FIPS 140-2","VALID"],["HMAC-SHA3","ONLINE"],["AUDIT TRAIL","100%"],["COI CHECK","CLEAR"],["ASSESSMENT","ONLINE"],["CERT REGISTRY","SYNCED"]].map(([l,s])=>'<div class="syc"><div class="syd sydg"></div><span style="color:var(--mu)">'+l+'</span>&nbsp;<span style="color:#22c55e;font-weight:600">'+s+'</span></div>').join("")}
  </div>
</div>

<!-- MISSION -->
<div class="ms">
  <div class="mg">
    <div class="rv">
      <div class="ey">Institutional Mission & Legal Positioning</div>
      <h2 class="sh">Infrastructure for UK innovation endorsement</h2>
      <p style="font-size:13px;color:var(--m2);line-height:1.8;margin-bottom:16px">Prime Endorsement Authority is not a UK Home Office Approved Endorsing Body and does not issue immigration endorsements. Our role is to provide advanced technology infrastructure, compliance systems, and institutional workflow support utilised by approved endorsing bodies and regulated partner institutions.</p>
      <div class="ml">
        ${["UK Innovator Founder Visa Route","Home Office Approved Framework","UKVI Compliant Certificate Issuance","Independent Expert Review Panels","FCA-Aligned Compliance Standards","ISO 27001 Data Security Practices","FIPS 140-2 Cryptographic Standards","Immutable Forensic Audit Trails"].map(function(i){return'<div class="mi"><span class="mc">✦</span><span class="mx">'+i+'</span></div>';}).join("")}
      </div>
    </div>
    <div class="rv rv1">
      ${[["🌍 Multi-Body Collaboration","Working with all Home Office Approved Endorsement Bodies for maximum reach and institutional credibility."],["🔐 Institutional Grade Security","Enterprise encryption, forensic audit trails and zero-trust compliance frameworks at every layer."],["📜 Verifiable Certificates","Official endorsement documents with cryptographic QR codes, immediately recognised by UKVI worldwide."],["⚡ Global Accessibility","Founders from any jurisdiction. 24/7 platform availability. Real-time status tracking across all active cases."]].map(([t,d])=>'<div class="hc2"><div class="ht">'+t+'</div><div class="hd2">'+d+'</div></div>').join("")}
    </div>
  </div>
</div>

<!-- CAPABILITIES -->
<section class="sec" id="capabilities">
  <div class="sei">
    <div class="rv"><div class="ey">Platform Architecture</div><h2 class="sh">Six pillars of institutional infrastructure.</h2><p class="sp">Select any capability to explore how it operates within the platform.</p></div>
    <div class="cg2">${capsHTML}</div>
  </div>
</section>

<!-- ROLES -->
<section class="sec" style="background:var(--bg2);padding-top:64px;padding-bottom:64px">
  <div class="sei">
    <div class="rv"><div class="ey">Platform Ecosystem</div><h2 class="sh">Built for every role in the ecosystem.</h2><p class="sp">Select a role to explore what the platform provides.</p></div>
    <div class="rts">
      <div class="rtb ac" onclick="sr('founders',this)">Endorsed Founders</div>
      <div class="rtb" onclick="sr('admins',this)">Administrators</div>
      <div class="rtb" onclick="sr('reviewers',this)">Expert Reviewers</div>
    </div>
    <div class="rc ac" id="r-founders">
      ${[["01","Investor Intelligence Directory","Anonymised listing in our curated investor-facing directory. Vetted angels, family offices and institutional VCs. Controlled introduction system with full founder consent."],["02","Strategic Advisory Network","Monthly office hours with sector experts. Peer mentorship from previously endorsed founders. Advisory board introductions and exclusive industry events."],["03","Milestone Progress Tracking","Post-endorsement KPI monitoring. Revenue, hiring, capital-raise and expansion milestones are tracked and compared against sector benchmarks in real time."],["04","Investor Secure Messaging","Direct encrypted messaging with connected investors. Full conversation history retained. Administrator-monitored for quality assurance and platform integrity."]].map(([n,t,d])=>'<div class="rf"><div class="rn">'+n+'</div><div><div class="rtl">'+t+'</div><div class="rde">'+d+'</div></div></div>').join("")}
    </div>
    <div class="rc" id="r-admins">
      ${[["01","Registration Management","Initiate and manage all applicant registrations. Dispatch cryptographically-signed invitations. Monitor intake pipeline in real time."],["02","Assessment Score Review","Review and override preliminary assessment scores with documented rationale. A full audit trail is maintained for all review decisions."],["03","Reviewer Assignment Engine","Assign 2–3 independent expert reviewers per application. COI screening runs automatically. Track reviewer progress and turnaround times."],["04","Command Centre Analytics","Full portfolio dashboard covering funnel health, approval rates, sector distribution and compliance monitoring."]].map(([n,t,d])=>'<div class="rf"><div class="rn">'+n+'</div><div><div class="rtl">'+t+'</div><div class="rde">'+d+'</div></div></div>').join("")}
    </div>
    <div class="rc" id="r-reviewers">
      ${[["01","Assigned Case Management","Access only your assigned applications. Full document vault access. Structured 5-dimension scoring rubric with guidance notes and benchmarks."],["02","COI Declaration System","Mandatory conflict-of-interest declaration before each review. Automatic reassignment on positive COI. Full audit logging."],["03","Panel Coordination","Multi-reviewer calibration tools. Discrepancy alerts trigger binding adjudication. Lead reviewer finalises with full documentation."],["04","Certificate Issuance","Approved cases instantly generate PDF certificates with cryptographic QR codes. Cases not approved receive structured, documented feedback in accordance with review protocols."]].map(([n,t,d])=>'<div class="rf"><div class="rn">'+n+'</div><div><div class="rtl">'+t+'</div><div class="rde">'+d+'</div></div></div>').join("")}
    </div>
  </div>
</section>

<!-- PROCESS -->
<section class="ps" id="how-it-works">
  <div class="sei">
    <div class="rv" style="text-align:center;margin-bottom:48px"><div class="ey" style="justify-content:center">The Endorsement Process</div><h2 class="sh" style="text-align:center">From invitation to endorsement</h2><p style="font-size:14px;color:var(--m2);text-align:center">Select each stage to explore the full process in detail.</p></div>
    <div class="pl2"><div class="pln"></div>${stagesHTML}</div>
    <div class="pf rv"><strong style="color:var(--g)">Total Timeline: Up to 90 Days</strong><br>From administrator-initiated invitation to final endorsement decision. AI acceleration available for high-scoring applications.</div>
  </div>
</section>

<!-- PROGRAMME OVERVIEW -->
<section class="sec" id="overview" style="background:var(--bg2)">
  <div class="sei">
    <div class="rv" style="text-align:center;margin-bottom:52px">
      <div class="ey" style="justify-content:center">Programme Overview</div>
      <h2 class="sh" style="text-align:center">What the Endorsement Programme Delivers</h2>
      <p style="font-size:14px;color:var(--m2);text-align:center;max-width:600px;margin:12px auto 0;line-height:1.8">Every invited applicant receives full access to the Prime Endorsement Authority ecosystem, from initial assessment through to post-endorsement support.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:960px;margin:0 auto 40px">
      ${[
        ["🔍","Independent Expert Assessment","Applications are evaluated by an assigned panel of independent expert reviewers across five structured dimensions."],
        ["🔐","Encrypted Document Vault","All submitted documentation is secured with AES-256 encryption. Access is restricted to assigned reviewers, with every view forensically logged."],
        ["📊","Real-Time Status Tracking","Applicants and administrators receive live status updates at every stage of the process, from submission through to final decision."],
        ["📜","QR-Verified Certificate","Approved founders receive an official endorsement certificate with cryptographic QR verification, immediately recognised by UKVI."],
        ["🌐","Post-Endorsement Ecosystem","Endorsed founders gain lifetime access to our investor intelligence directory, strategic advisory network and structured milestone tracking."],
        ["🛡️","Compliance-First Architecture","Built on zero-trust security principles, FIPS 140-2 cryptographic standards and an immutable forensic audit trail at every layer."]
      ].map(([icon,title,desc])=>'<div class="hc2 rv"><div class="ht">'+icon+' '+title+'</div><div class="hd2">'+desc+'</div></div>').join("")}
    </div>
    <div style="text-align:center" class="rv">
      <div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.18);border-radius:12px;padding:28px 36px;max-width:520px;margin:0 auto;display:inline-block">
        <div style="font-size:9px;font-weight:600;color:var(--g);letter-spacing:.3em;text-transform:uppercase;margin-bottom:10px;font-family:'JetBrains Mono',monospace">Access Model</div>
        <div style="font-size:20px;font-weight:600;color:var(--tx);letter-spacing:.05em;margin-bottom:8px">By Invitation Only</div>
        <div style="font-size:13px;color:var(--m2);line-height:1.7;margin-bottom:20px">All registrations are administrator-initiated. Programme details are provided at the point of invitation.</div>
        <a href="mailto:admin@primeendorsement.com"><button class="cp">Request an Invitation →</button></a>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="sec" id="faq" style="background:var(--bg2)">
  <div class="sei">
    <div class="rv" style="text-align:center;margin-bottom:40px"><div class="ey" style="justify-content:center">Everything You Need to Know</div><h2 class="sh" style="text-align:center">Frequently Asked Questions</h2></div>
    <div class="qa">${faqsHTML}</div>
  </div>
</section>

<!-- CTA -->
<section class="cs2">
  <div style="max-width:640px;margin:0 auto" class="rv">
    <div class="ey" style="justify-content:center;margin-bottom:16px">Get Started</div>
    <h2 class="ch">Begin Your Endorsement Journey</h2>
    <p class="csb">All registrations are administrator-initiated. Contact us to request a secure invitation to the platform.</p>
    <div class="cbs">
      <a href="mailto:admin@primeendorsement.com"><button class="cp">Request an Invitation →</button></a>
      <a href="/api/functions/peaStatusPage"><button class="cg">Track Your Application →</button></a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="fo">
  <div class="fg">
    <div>
      <div class="nl" style="margin-bottom:14px"><div class="ni">P</div><div class="nt"><span class="na">Prime Endorsement</span><span class="nb">Authority</span></div></div>
      <p class="ftg">Institutional-grade infrastructure for the UK Innovator Founder Visa endorsement ecosystem. Invitation-only. Professionally administered.</p>
      <div class="fcm">${["ISO 27001","FIPS 140-2","AES-256","TLS 1.3","UKVI Aligned","Est. 2025"].map(function(b){return'<span class="fbg">'+b+'</span>';}).join("")}</div>
    </div>
    <div><div class="fc3">Platform</div><div class="fls"><a class="flk" href="/api/functions/peaHomePage">Home</a><a class="flk" href="/apply">Apply</a><a class="flk" href="/api/functions/peaStatusPage">Track Application</a><a class="flk" href="/portal">Member Portal</a></div></div>
    <div><div class="fc3">Authority</div><div class="fls"><a class="flk" href="#">Privacy Policy</a><a class="flk" href="#">Terms of Service</a><a class="flk" href="#">Cookie Policy</a><a class="flk" href="#">Security Standards</a></div></div>
    <div><div class="fc3">Contact</div><div class="fls"><a class="flk" href="mailto:admin@primeendorsement.com">admin@primeendorsement.com</a><a class="flk" href="/api/functions/peaHomePage">primeendorsement.com</a><a class="flk" href="/admin-login">Admin Login</a></div></div>
  </div>
  <div class="fbt"><span class="fcp">© 2026 Prime Endorsement Authority. All rights reserved. Regulated infrastructure. Invitation-only platform.</span><span class="fcp">UKVI aligned · ISO 27001 · Institutional Infrastructure</span></div>
</footer>

<script>
// UTC CLOCK
function uc(){const n=new Date(),pad=x=>x.toString().padStart(2,'0');const el=document.getElementById('clk');if(el)el.textContent=pad(n.getUTCHours())+':'+pad(n.getUTCMinutes())+':'+pad(n.getUTCSeconds())+' UTC';}
setInterval(uc,1000);uc();
// THREAT
const thrs=["Assessment Framework · v3.2 · All review dimensions operational","AES-256-GCM encryption layer · 100% integrity confirmed","Zero-trust perimeter · Active · 0 anomalies detected","COI Protocol · All reviewers cleared · No conflicts","Forensic audit trail · HMAC chain validated · Intact","TLS 1.3 mutual authentication · Session verified","FIPS 140-2 cryptographic module · Validated"];
let ti=0;setInterval(()=>{ti=(ti+1)%thrs.length;const e=document.getElementById('tmsg');if(e){e.style.opacity='0';setTimeout(()=>{e.textContent=thrs[ti];e.style.opacity='1';},400);}},4000);
// ANNOUNCEMENTS
const anns=[{tag:"MILESTONE",text:"Prime Endorsement Authority surpasses 180+ endorsed founders from 42 countries across the UK innovation ecosystem.",date:"Apr 2026"},{tag:"REGULATORY",text:"UKVI confirms continued recognition of Prime Endorsement Authority certificates for the Innovator Founder Visa route.",date:"Mar 2026"},{tag:"TECHNOLOGY",text:"Assessment Framework v3.2 deployed. 94% precision achieved across all evaluation dimensions.",date:"Feb 2026"}];
let ai=0;setInterval(()=>{ai=(ai+1)%3;const a=anns[ai];const t=document.getElementById('atx');if(t){t.style.opacity='0';setTimeout(()=>{t.textContent=a.text;t.style.opacity='1';},300);}const tg=document.getElementById('atg');if(tg)tg.textContent=a.tag;const dt=document.getElementById('adt');if(dt)dt.textContent=a.date;[0,1,2].forEach(i=>{const d=document.getElementById('ad'+i);if(d)d.style.background=i===ai?'var(--g)':'rgba(201,168,76,.25)';});},6000);
// LIVE VENTURE
const vens=["· Milestone verified · TechNova Ltd ·","· Reviewer assigned · BioSynth Diagnostics ·","· Endorsed · QuantumPay Solutions ·","· Document verified · GreenGrid Systems ·"];
let vi=0;setInterval(()=>{vi=(vi+1)%4;const e=document.getElementById('lv');if(e)e.textContent=vens[vi];},3000);
// PARALLAX
document.addEventListener('mousemove',e=>{const h=document.getElementById('hero-section');if(!h)return;const r=h.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;[{id:'s1',mx:20,my:15},{id:'s2',mx:-15,my:20},{id:'s3',mx:18,my:-12},{id:'s4',mx:-12,my:-18}].forEach(s=>{const el=document.getElementById(s.id);if(el)el.style.transform='translate('+((x-.5)*s.mx)+'px,'+((y-.5)*s.my)+'px) rotate(15deg)';});});
// REVEAL
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vi');}),{threshold:0.1});
document.querySelectorAll('.rv').forEach(el=>obs.observe(el));
// COUNT UP
const co=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const el=e.target,t=parseInt(el.dataset.t,10);let c=0;const tm=setInterval(()=>{c=Math.min(c+t/60,t);el.textContent=Math.round(c).toLocaleString();if(c>=t)clearInterval(tm);},30);co.unobserve(el);}});},{threshold:.5});
document.querySelectorAll('.cu').forEach(el=>co.observe(el));
// DASH TABS
function sdt(tab,btn){['command','founder','investor'].forEach(t=>{const e=document.getElementById('dt-'+t);if(e)e.style.display=t===tab?'block':'none';});document.querySelectorAll('.dta').forEach(b=>b.classList.remove('ac'));if(btn)btn.classList.add('ac');}
// CAP CARDS
function tcc(c){const w=c.classList.contains('ex');document.querySelectorAll('.cc').forEach(x=>x.classList.remove('ex'));if(!w)c.classList.add('ex');}
// PROCESS
function tp(i){const el=document.getElementById('proc-'+i);if(!el)return;const w=el.classList.contains('op');document.querySelectorAll('.pi2').forEach(p=>p.classList.remove('op'));if(!w)el.classList.add('op');}
// ROLES
function sr(r,btn){['founders','admins','reviewers'].forEach(x=>{const e=document.getElementById('r-'+x);if(e){e.classList.remove('ac');e.style.display='none';}});const a=document.getElementById('r-'+r);if(a){a.classList.add('ac');a.style.display='grid';}document.querySelectorAll('.rtb').forEach(b=>b.classList.remove('ac'));if(btn)btn.classList.add('ac');}
// FAQ
function tf(i){const el=document.getElementById('faq-'+i);if(!el)return;const w=el.classList.contains('op');document.querySelectorAll('.qi').forEach(f=>f.classList.remove('op'));if(!w)el.classList.add('op');}
// SMOOTH SCROLL
document.querySelectorAll('a[href^="#"]').forEach(a=>{a.addEventListener('click',function(e){const t=document.querySelector(this.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}});});
// INIT
['founders','admins','reviewers'].forEach(r=>{const e=document.getElementById('r-'+r);if(e)e.style.display=r==='founders'?'grid':'none';});
</script>
</body>
</html>`;
}

export default async function handler(req:Request):Promise<Response>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
  return new Response(buildHTML(),{status:200,headers:H});
}

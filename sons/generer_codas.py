import numpy as np, wave
sr=44100; dur=28.0; N=int(sr*dur)
rng=np.random.default_rng(7)

def click(ipi, f0, amp):
    """Clic multi-pulsé : l'impulsion rebondit dans l'organe du spermaceti (IPI = taille de l'animal)."""
    n=int(sr*0.03); out=np.zeros(n)
    m=int(sr*0.0025); t=np.arange(m)/sr
    for p in range(5):
        env=np.exp(-t/0.00035)
        pulse=env*(np.sin(2*np.pi*f0*t)+0.6*np.sin(2*np.pi*f0*1.9*t+1)+0.5*rng.standard_normal(m))
        i=int(p*ipi*sr)
        out[i:i+m]+=pulse*(0.55**p)*(-1)**p
    return amp*out

# motifs de codas (intervalles en secondes) : 1+1+3, 5R, 4R, 2+3, 8R
P={'1+1+3':[0,.36,.72,.83,.94],'5R':[0,.2,.4,.6,.8],'4R':[0,.25,.5,.75],
   '2+3':[0,.14,.50,.62,.74],'8R':[i*.13 for i in range(8)]}
# deux cachalots qui se répondent : (début, motif, baleine)
seq=[(1.5,'1+1+3',0),(3.6,'1+1+3',1),(6.0,'5R',0),(7.9,'5R',1),(10.5,'1+1+3',0),(11.0,'1+1+3',1),
     (14.0,'2+3',0),(16.2,'4R',1),(18.5,'8R',0),(21.0,'1+1+3',1),(23.2,'1+1+3',0),(23.5,'1+1+3',1)]
W=[dict(ipi=.0042,f0=4200,amp=1.0,pan=.3),dict(ipi=.0033,f0=5600,amp=.55,pan=.75)]
dry=np.zeros((N,2))
for t0,name,w in seq:
    b=W[w]; rub=1+rng.uniform(-.06,.06)  # rubato : tempo légèrement variable
    for k,dt in enumerate(P[name]):
        c=click(b['ipi'],b['f0']*(1+rng.uniform(-.03,.03)),b['amp']*(1+rng.uniform(-.1,.1)))
        i=int((t0+dt*rub+rng.uniform(-.004,.004))*sr)
        dry[i:i+len(c),0]+=c*(1-b['pan']); dry[i:i+len(c),1]+=c*b['pan']

# réverbération sous-marine : queue diffuse + écho surface/fond, aigus absorbés
L=int(sr*2.5); tt=np.arange(L)/sr
def lp(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/sr); return np.fft.irfft(X/(1+(f/fc)**2),len(x))
wet=np.zeros((N,2))
for ch in range(2):
    ir=lp(rng.standard_normal(L)*np.exp(-tt/0.6),2500)*0.02
    for d,g in((.11,.35),(.27,.22),(.55,.12)): ir[int(d*sr)]+=g
    n=N+L; wet[:,ch]=np.fft.irfft(np.fft.rfft(dry[:,ch],n)*np.fft.rfft(ir,n),n)[:N]
mix=dry+0.9*wet

# ambiance des profondeurs : grondement grave + houle lente
amb=np.zeros((N,2))
for ch in range(2):
    X=np.fft.rfft(rng.standard_normal(N)); f=np.fft.rfftfreq(N,1/sr); f[0]=1
    a=np.fft.irfft(X/f*np.exp(-f/400),N); a/=np.abs(a).max()
    amb[:,ch]=a*(0.75+0.25*np.sin(2*np.pi*0.07*np.arange(N)/sr+ch))
mix=mix/np.abs(mix).max()*0.8+amb*0.12
fade=int(sr*1.5); e=np.ones(N); e[:fade]=np.linspace(0,1,fade); e[-fade:]=np.linspace(1,0,fade)
mix=(mix*e[:,None]); mix=mix/np.abs(mix).max()*0.9
with wave.open('/home/user/robloxprojecy/sons/codas_cachalots.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok',N/sr)

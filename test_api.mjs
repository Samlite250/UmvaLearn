const res = await fetch('http://localhost:3002/api/translate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text:'Hello world', sourceLang:'en', targetLang:'fr'})
});
console.log(res.status);
console.log((await res.text()).substring(0,200));

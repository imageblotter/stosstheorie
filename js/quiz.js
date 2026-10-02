'use strict';

(() => {
  const Q = [
    { q: 'Was muss für einen wirksamen Stoß erfüllt sein?',
      o: ['Nur die Teilchen müssen zusammenstoßen', 'Zusammenstoß, ausreichende Energie (E ≥ E_A) und passende Orientierung', 'Nur die Energie muss ausreichen', 'Die Teilchen müssen sich möglichst langsam bewegen'],
      a: 1, e: 'Alle drei Bedingungen müssen gleichzeitig erfüllt sein.' },
    { q: 'Die Konzentration von A und B wird jeweils verdoppelt. Wie ändert sich die Zahl der A–B-Stöße pro Zeit ungefähr?',
      o: ['Sie bleibt gleich', 'Sie verdoppelt sich', 'Sie vervierfacht sich', 'Sie halbiert sich'],
      a: 2, e: 'Die Stoßzahl ist proportional zu c(A)·c(B), also 2 · 2 = 4.' },
    { q: 'Warum steigt die Reaktionsgeschwindigkeit bei höherer Temperatur so stark an?',
      o: ['Die Teilchen sind größer', 'Die Aktivierungsenergie sinkt', 'Vor allem, weil deutlich mehr Teilchen die Aktivierungsenergie erreichen', 'Es gibt mehr Teilchen'],
      a: 2, e: 'Die Stoßzahl steigt nur wenig, der Anteil der Teilchen mit E ≥ E_A aber stark (Maxwell-Boltzmann-Verteilung).' },
    { q: 'Was besagt die RGT-Regel?',
      o: ['+10 K → Reaktionsgeschwindigkeit ca. 2- bis 3-fach', '+10 K → Geschwindigkeit halbiert', '+1 K → Geschwindigkeit verdoppelt', 'Die Temperatur hat bei Reaktionen keinen Einfluss'],
      a: 0, e: 'Faustregel für viele Reaktionen bei Raumtemperatur; sie folgt aus der Arrhenius-Gleichung.' },
    { q: 'Warum reagiert Sägemehl schneller mit Sauerstoff als ein Holzblock gleicher Masse?',
      o: ['Sägemehl hat eine höhere Temperatur', 'Sägemehl hat eine viel größere Oberfläche und damit mehr Stoßmöglichkeiten', 'Sägemehl enthält einen Katalysator', 'Sägemehl hat eine niedrigere Aktivierungsenergie'],
      a: 1, e: 'Größere Oberfläche → mehr Stöße mit den Gasteilchen. Die Aktivierungsenergie bleibt gleich.' },
    { q: 'Was bewirkt ein Katalysator?',
      o: ['Er erhöht die Temperatur', 'Er senkt die Aktivierungsenergie, indem er einen anderen Reaktionsweg ermöglicht', 'Er erhöht die Zahl der Teilchen', 'Er wird bei der Reaktion vollständig verbraucht'],
      a: 1, e: 'Mit niedrigerer E_A ist ein größerer Anteil der Stöße wirksam. Der Katalysator liegt nach der Reaktion unverändert vor.' }
  ];
  const box = document.getElementById('quiz'), score = document.getElementById('quizScore');
  let done = 0, right = 0;
  Q.forEach(item => {
    const d = document.createElement('div'); d.className = 'q';
    d.innerHTML = `<p>${item.q}</p>`;
    const expl = document.createElement('p'); expl.className = 'expl'; expl.hidden = true; expl.textContent = item.e;
    const btns = item.o.map((t, i) => {
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = t;
      b.addEventListener('click', () => {
        btns.forEach((x, j) => { x.disabled = true; if (j === item.a) x.classList.add('right'); });
        if (i !== item.a) b.classList.add('wrong'); else right++;
        expl.hidden = false; done++;
        if (done === Q.length) score.textContent = `Ergebnis: ${right} von ${Q.length} richtig.`;
      });
      d.appendChild(b); return b;
    });
    d.appendChild(expl); box.appendChild(d);
  });
})();

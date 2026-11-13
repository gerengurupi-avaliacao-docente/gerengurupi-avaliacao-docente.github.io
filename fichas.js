// Gera as fichas dos docentes em PDF, no navegador, no mesmo modelo das fichas de 2025
// (brasão, cabeçalho do MEC/IFTO, um quadro por turma e disciplina, pontuação da turma e resultado final).
// Usa jsPDF (lib/jspdf.umd.min.js) e JSZip (lib/jszip.min.js).

var FICHAS = (function () {
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var brasao = null;   // dataURL do brasao.jpg, carregado uma vez

  function carregarBrasao() {
    if (brasao) return Promise.resolve(brasao);
    return fetch('brasao.jpg').then(function (r) { if (!r.ok) throw new Error('brasão'); return r.blob(); })
      .then(function (b) { return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { brasao = f.result; ok(brasao); }; f.readAsDataURL(b); }); })
      .catch(function () { brasao = ''; return ''; });     // sem brasão a ficha sai do mesmo jeito
  }

  function notaBr(x) { return x === null || x === undefined ? '–' : Number(x).toFixed(1).replace('.', ','); }

  function nomeArquivo(s) { return String(s).replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim(); }

  /** Desenha uma ficha a partir da posição atual do documento (cada docente começa em página nova). */
  function desenhar(doc, res, d, rodape) {
    var L = 20, R = 190, W = R - L, COLN = 24, y = 16, ALT_LINHA = 4.6;
    var semestre = res.semestre;
    if (brasao) { doc.addImage(brasao, 'JPEG', 105 - 11, y, 22, 22); y += 26; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    doc.text('MINISTÉRIO DA EDUCAÇÃO', 105, y, { align: 'center' }); y += 5;
    doc.text('SECRETARIA DE EDUCAÇÃO PROFISSIONAL E TECNOLÓGICA', 105, y, { align: 'center' }); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('INSTITUTO FEDERAL DO TOCANTINS', 105, y, { align: 'center' }); y += 5;
    if (res.campus) { doc.text('CAMPUS ' + res.campus.toUpperCase(), 105, y, { align: 'center' }); y += 5; }
    y += 4;
    doc.setFont('helvetica', 'bold'); doc.text('RESULTADO AVALIAÇÃO DISCENTE', 105, y, { align: 'center' }); y += 9;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('Avaliação: Avaliação docente ' + semestre, L, y); y += 5;
    doc.text('Docente: ' + d.docente + ' (' + d.id + ')', L, y); y += 7;

    var novaPagina = function (precisa) { if (y + precisa > 280) { doc.addPage(); y = 18; } };
    var linhaTabela = function (texto, valor, negrito, centro) {
      doc.setFont('helvetica', negrito ? 'bold' : 'normal');
      var larg = centro ? W - 4 : W - COLN - 4;
      var ls = doc.splitTextToSize(texto, larg), alt = ls.length * ALT_LINHA + 2.6;
      doc.rect(L, y, W, alt);
      if (centro) doc.text(ls, 105, y + 4.4, { align: 'center' });
      else {
        doc.line(R - COLN, y, R - COLN, y + alt);
        doc.text(ls, L + 2, y + 4.4);
        doc.text(valor, R - COLN / 2, y + alt / 2 + 1.4, { align: 'center' });
      }
      y += alt;
    };
    doc.setLineWidth(0.25); doc.setFontSize(9.5);
    d.blocos.forEach(function (b) {
      novaPagina(78);                                   // um quadro não é cortado entre páginas
      linhaTabela(b.turma + ' (' + b.disc + ')', '', true, true);
      res.perguntas.forEach(function (p, i) { linhaTabela((i + 1) + '. ' + p.t, notaBr(b.medias[i]), false); });
      linhaTabela('PONTUAÇÃO DA TURMA (SOMATÓRIA DAS MÉDIAS DIVIDIDO POR DOIS)', notaBr(b.pont), true);
      y += 6;
    });
    novaPagina(40);                                     // deixa folga no rodapé da última página para o carimbo da assinatura digital
    linhaTabela('MÉDIA DA PONTUAÇÃO DAS TURMAS CONSOLIDADO – RESULTADO FINAL', notaBr(d.final), true);
    y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(rodape, R, y, { align: 'right' });
  }

  function rodapeData(res, data) {
    var d = data || new Date();
    return (res.cidade ? res.cidade + ', ' : '') + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function novoDoc() { return new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }); }

  /** Uma ficha só (Blob PDF). */
  function uma(res, docente, data) {
    return carregarBrasao().then(function () {
      var doc = novoDoc();
      desenhar(doc, res, docente, rodapeData(res, data));
      return doc.output('blob');
    });
  }

  /**
   * Todas as fichas: devolve {zip: Blob com um PDF por docente + o PDF único, unico: Blob}.
   * progresso(feitos, total) é chamado a cada docente, para a barra da tela.
   */
  function todas(res, progresso, data) {
    var rodape = rodapeData(res, data), zip = new JSZip(), unico = null, i = 0, total = res.docentes.length;
    var pasta = 'Fichas ' + res.semestre.replace('/', '_');
    return carregarBrasao().then(function () {
      unico = novoDoc();
      return new Promise(function (ok, falha) {
        var passo = function () {
          try {
            var fim = Math.min(total, i + 5);           // 5 por vez, para a tela não travar
            for (; i < fim; i++) {
              var d = res.docentes[i], doc = novoDoc();
              desenhar(doc, res, d, rodape);
              zip.file(pasta + '/' + nomeArquivo(d.docente) + '.pdf', doc.output('arraybuffer'));
              if (i > 0) unico.addPage();
              desenhar(unico, res, d, rodape);
            }
            if (progresso) progresso(i, total);
            if (i < total) setTimeout(passo, 0); else ok();
          } catch (e) { falha(e); }
        };
        passo();
      });
    }).then(function () {
      var blobUnico = unico.output('blob');
      zip.file(pasta + '/Todas as fichas ' + res.semestre.replace('/', '_') + '.pdf', unico.output('arraybuffer'));
      return zip.generateAsync({ type: 'blob' }).then(function (z) { return { zip: z, unico: blobUnico, pasta: pasta }; });
    });
  }

  return { uma: uma, todas: todas, nomeArquivo: nomeArquivo };
})();

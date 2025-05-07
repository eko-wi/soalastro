/*
urutan mengambil sebagian isi dokumen berdasarkan keywords
entry dimulai dengan
<start>
judul entry
<tags>
tag1,tag2,tag3
<info>
P (PG atau E untuk essay, atau kode huruf lainnya seperti ? untuk soal tidak jelas)
<solusi>
(solusi soal, kalau ada. Semua harus ditulis dalam satu paragraf saja.)
<text>
teks utama yang menyusun entry. Bisa termasuk images dan list.
<end>

*/
const outputdocID = "1rlQ_LzkLpW7nfdWzLWkJueVoXlP83SdUlFrfI76NcwU";
const outputdocURL="https://docs.google.com/document/d/1rlQ_LzkLpW7nfdWzLWkJueVoXlP83SdUlFrfI76NcwU/edit?tab=t.0"
//const outputdocID = "1FsORG8rDIDtS7qsUCvEQT_eFeDeUAYDus6dWvNvOvzE";
//const outputdocURL="https://docs.google.com/document/d/1FsORG8rDIDtS7qsUCvEQT_eFeDeUAYDus6dWvNvOvzE/edit?usp=sharing"
const outputtabName = "output";
const databasetabname = "database";
const indexdocID = "1TUIyKI6RacmCWnzTev9wstKjQ6leVui1UM0Daz0BbHc";
const indexsheetname = "astronomi"
const indextabname = "index";
const startKeyword = '<start>';
const endKeyword = '<end>';
const tagskeyword='<tags>';
const infokeyword='<info>';
const solusikeyword='<solusi>';
const textkeyword='<text>';
const standardstyle={
  [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT,
  [DocumentApp.Attribute.FONT_FAMILY]: "Arial",
  [DocumentApp.Attribute.FONT_SIZE]: 11,
  [DocumentApp.Attribute.BOLD]: false
};
/*
index berisi kumpulan tags tiap soal, diikuti angka (index child element) yang menunjuk judul, lalu info (string aslinya), lalu (angka index)awal teks, akhir teks
*/
function copyelement(el, destbody){
  const type = el.getType();
  if(type===DocumentApp.ElementType.PARAGRAPH){
    destbody.appendParagraph(el.copy());
  }
  else if(type===DocumentApp.ElementType.INLINE_IMAGE){
    destbody.appendImage(el.copy());
  }
  else if(type===DocumentApp.ElementType.LIST_ITEM){
    var a = destbody.appendListItem(el.copy());
    //copy juga glyph-nya (a b c atau - - - atau 1. 2. 3. dll)
    a.setGlyphType(el.getGlyphType());
  }
  else if(type===DocumentApp.ElementType.TABLE){
    destbody.appendTable(el.copy());
  }
}

function addindexrecord(entry, sheet){
  //entry berisi: n, tags, ititle, info, istart, iend
  const targetrange=sheet.getRange(entry.n,1,1,6); //row, col, numrow, numcol
  targetrange.setValues([[entry.tags, entry.ititle, entry.info, entry.isolusi, entry.istart, entry.iend]]);
}
function readindexrecord(n, sheet){
  const record=sheet.getRange(n,1,1,6).getValues();
  return {
    n:n,
    tags:record[0][0],
    ititle:record[0][1],
    infostr:record[0][2],
    isolusi:record[0][3],
    istart:record[0][4],
    iend:record[0][5]
  };
}
function generateindex(){
  //jelajahi isi tab database dan hasilkan index di gsheets "index"
  const doc = getTabByName(databasetabname).asDocumentTab();
  const body=doc.getBody(); 
  const indexSS = SpreadsheetApp.openById(indexdocID);
  const indexsheet = indexSS.getSheetByName(indexsheetname);
  indexSS.setActiveSheet(indexsheet);
  //const outputdoc = getTabByName(indextabname).asDocumentTab();
  //const outputbody=outputdoc.getBody(); 
  //outputbody.clear();
  let isWithinSegment = false;
  let foundStart = false;
  //let ismatch=false;
  let titlestr="";
  let ititle=-1, istarttext=-1, iendtext=-1;
  let infostr="";
  let titleelement=null;
  let nmatches=0;
  const numElements = body.getNumChildren();

  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    const type = element.getType();
    //console.log(i);
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      const text = element.getText();
      if(!foundStart&&text.startsWith(startKeyword)){
        //ambil elemen berikutnya
        foundStart=true;
        nmatches++;
        ititle=i+1;
        titleelement=body.getChild(i+1);
        titlestr=titleelement.getText();
        if(titlestr.startsWith(tagskeyword)){ //tidak ada entry ini, langsung tags
          ititle=-1;
        }     
        //console.log("n:"+nmatches+" title:"+ititle);
      }
      else if(foundStart&&text.startsWith(tagskeyword)){
        i++; //maju satu element, langsung baca
        tagstr=body.getChild(i).getText().replaceAll(' ', ''); //hilangkan semua spasi kalau ada
        //console.log(tagstr);
      }
      else if(foundStart&&text.startsWith(infokeyword)){
        i++;
        infostr=body.getChild(i).getText().replaceAll(' ', ''); //hilangkan semua spasi kalau ada
        //console.log(infostr);
      }
      else if(foundStart&&text.startsWith(solusikeyword)){
        i++;
        isolusi=i;
        //console.log("isolusi:"+isolusi);
      }
      else if(foundStart&&text.startsWith(textkeyword)){
        istarttext=i+1; //catat indeks elemen yang merupakan awal teks
        isWithinSegment=true; 
        //console.log("start:"+istarttext);
      }
      else if(text.startsWith(endKeyword)){
          iendtext=i-1; //catat akhir indeks. teks diambil dari elemen ke-startindex sampai endindex
          //console.log("end:"+iendtext);
          if(isWithinSegment){
            indexrecord={
              n:nmatches,
              tags:tagstr,
              ititle:ititle,
              info:infostr,
              isolusi:isolusi,
              istart: istarttext,
              iend: iendtext
            };
            addindexrecord(indexrecord, indexsheet);
          }
          isWithinSegment=false;
          ismatch=false;
          foundStart=false;
          titleelement=null;
          ititle=-1;
          iinfo=-1;
          istarttext=-1;
          iendtext=-1;
      }
    }
  }
  return nmatches;  
}

function retrievefromindex(indexpos, destbody, withsolution=false){
  //indexpos mulai dari 1
  const indexSS = SpreadsheetApp.openById(indexdocID);
  const indexsheet = indexSS.getSheetByName(indexsheetname);
  const doc = getTabByName(databasetabname).asDocumentTab();
  const body=doc.getBody(); 
  //const indexdoc = getTabByName(indextabname).asDocumentTab();
  //const indexbody=indexdoc.getBody(); 
  indexSS.setActiveSheet(indexsheet);
  //urutan kolom: tags, ititle, info, isolution, istart, iend
  //const readrange=indexsheet.getRange(indexpos,1,1,6).getValues();
  const indexrecord = readindexrecord(indexpos,indexsheet);
  //ambil title dari database, ditandai posisi element kesekian
  const ititle=indexrecord.ititle;
  console.log(ititle);
  if(ititle>0){
    destbody.appendParagraph(body.getChild(ititle).copy());
  }
  const istart=indexrecord.istart;
  const iend=indexrecord.iend;
  console.log(istart + " - " + iend);
  //ambil element-element yang ditunjuk oleh istarttext sampai iendtext
  for(let i= +istart; i <= +iend; i++){
    console.log("copying element "+i);
    element = body.getChild(i);
    copyelement(element,destbody);
  }
  if (withsolution){
    const isolusi=indexrecord.isolusi;
    destbody.appendParagraph('Solusi:').setAttributes(standardstyle);
    if(isolusi>0){
      destbody.appendParagraph(body.getChild(isolusi).copy());
    }
    else{
      destbody.appendParagraph("?");
    }
  }
  //append paragraph kosong
  destbody.appendParagraph('');
}
function getTabByName(name){
  const tabs = DocumentApp.getActiveDocument().getTabs();
  for (let t of tabs){
    if(t.getTitle()==name){
      return t;
    }
  }
  return null;
}

function copytab(dest, source){ //dest dan source adalah document body yang diambil dari tab.asDocumentTab()
  const destbody = dest.getBody();
  const sourcebody = source.getBody();
  const n = sourcebody.getNumChildren();
  destbody.clear();
  for(let i=0;i<n;i++){
    const e = sourcebody.getChild(i);
    copyelement(e,destbody);
    /*
    const type = e.getType();
    if(type===DocumentApp.ElementType.PARAGRAPH){
      destbody.appendParagraph(e.copy());
    }
    else if(type===DocumentApp.ElementType.INLINE_IMAGE){
      destbody.appendImage(e.copy());
    }
    else if(type===DocumentApp.ElementType.LIST_ITEM){
      var a = destbody.appendListItem(e.copy());
      //copy juga glyph-nya (a b c atau - - - atau 1. 2. 3. dll)
      a.setGlyphType(e.getGlyphType());
    }
    else if(type===DocumentApp.ElementType.TABLE){
      destbody.appendTable(e.copy());
    }
    */
  }
  return n;
}

function findfromtags(qtagstr, qinfo='', method='ANY',countonly=0){
  const indexSS = SpreadsheetApp.openById(indexdocID);
  const indexsheet = indexSS.getSheetByName(indexsheetname);
  indexSS.setActiveSheet(indexsheet);
  let nmatches=0;

  //tag adalah string yang berisi beberapa kata yang dipisahkan koma
  const qtaglist=qtagstr.split(",");

  const numindex=indexsheet.getLastRow();
  matches=[];
  for(let i=1;i<=numindex;i++){
    indexrecord=readindexrecord(i,indexsheet);
    var tagslist = indexrecord.tags.split(',');
    var ismatch=false;
    if(method=='ANY'){
      ismatch=qtaglist.some(r=>tagslist.includes(r));
    }
    else if(method=='ALL'){
      ismatch=qtaglist.every(r=>tagslist.includes(r));
    }
    if (ismatch){
      //cek info, apa sesuai dengan yang diminta
      var infostr = indexrecord.infostr;
      if(qinfo=='P' || qinfo=='E'){
        //ambil soal PG atau essay saja. kalau qinfo kosong, ambil semuanya
        if (!(infostr.includes(qinfo))){
          ismatch=false;
        }
      }
    }
    if(ismatch){
      nmatches++;
      if(countonly==0){
        matches.push(i);
      }
    }
  }
  if(countonly==0){
    return matches;
  }
  else{
    return nmatches;
  }
}
function findmention(t){
   doc = getTabByName('soal').asDocumentTab();
    body=doc.getBody();
    var res=null;
    var jumlah=0;
    var strhasil='';
    while(res=body.findText(t,res)){ //find mulai dari posisi [res]
      jumlah += 1;
      //strhasil += body.getChildIndex(res.getElement());
      strhasil += res.getElement().getText();
      strhasil += '\n';
      if(jumlah>100){
        break;
      }
    }
  
  var hasil = 'kata '+ t +' muncul ' + jumlah + ' kali.';
  hasil += '\n';
  hasil += strhasil;
  return hasil;
}
function getTabUrl(tabname){
  doc = getTabByName(tabname).asDocumentTab();
  if(doc==null){
    return "";
  }
  else{
    return DocumentApp.getActiveDocument().getUrl()+'?tab='+getTabByName(outputtabName).getId();
  }
}
function processRequest(e) {
  //serve text
  // https://developers.google.com/apps-script/guides/content
  //serve HTML
  //https://developers.google.com/apps-script/guides/web
  //structure of a document
  //https://developers.google.com/apps-script/guides/docs

  //baca url parameters
  //var f = e.parameters['find'];
  var t = e.parameters['tag'];
  var m = e.parameters['m']; //methods, any atau all
  var tipesoal = e.parameters['t']; //'P' untuk PG atau 'E' untuk essay atau kosongkan untuk keduanya
  var outputtype = e.parameters['o']; //text atau pdf atau entah apa?
  var jumlahsoal = e.parameters['n']; //jumlah soal yang diharapkan
  var withsolution = e.parameters['s']; //pakai solusinya atau tidak?
  var keywords='';
  var hasil=0;
  var outputstr="No result or error.";
  //var contenttype="html";
  if(typeof(jumlahsoal)!=='undefined' && jumlahsoal.length>0){
    jumlahsoal=+(jumlahsoal[0]);
  }
  else{
    jumlahsoal=0;
  }
  if(typeof(withsolution)!=='undefined' && withsolution.length>0){
    withsolution=true;
  }
  else{
    withsolution=false;
  }
  if(typeof(outputtype)!=='undefined' && outputtype.length>0){
    if(outputtype[0]=='pdf'){
      outputtype='pdf';
    }
    else if(outputtype[0]=='n'){ //hitung ada berapa yang memenuhi kriteria search, return angkanya saja jangan kirim filenya
      outputtype='n';
    }
    else{
      outputtype="text";
    }
  }
  if(typeof(tipesoal)!=='undefined' && tipesoal.length>0){
    tipesoal=f[0];
  }
  else{
    tipesoal='';
  }
  /*
  if(typeof(f)!=='undefined' && f.length>0){
    keywords=f[0];
    hasil=findmention(keywords);
    //return ContentService.createTextOutput(hasil);
    outputstr=String(hasil);
  }
  else */
  if(typeof(t)!=='undefined' && t.length>0){ //tags
    //contenttype="data";
    keywords=t[0];
    var method='ANY';
    if(typeof(m)!=='undefined' && m.length>0){
      if(m[0]=='all' || m[0]=='ALL'){
        method='ALL';
      }
    }
    var count_only=0;
    if(outputtype=='n'){
      count_only=1;
    }
  }
  else{ //tidak ada parameter tags
    return ContentService
      .createTextOutput("Error - tags tidak diisi.")
      .setMimeType(ContentService.MimeType.TEXT); 
  }
  //===========analisis request selesai==============
  console.log(keywords+','+tipesoal+','+method+','+count_only);
  hasil=findfromtags(keywords,tipesoal,method,count_only); 
  console.log(hasil);
  //==============memulai output building============
  const newdoc=DocumentApp.openById(outputdocID); //dokumen untuk publish export hasil
  //const newdoc=DocumentApp.openByUrl(outputdocURL); //dokumen untuk publish export hasil
  //const newdoc = DocumentApp.create("Daftar soal");
  var adahasil=false;
  if(count_only==0 && hasil.length>0){
    //hasil berisi array of index entries
    adahasil=true;
    //output ke tab "output"
    const outputdoc = getTabByName(outputtabName).asDocumentTab();
    const outputbody=outputdoc.getBody();
    outputbody.clear();
    //randomize index entries
    hasil.sort(()=>Math.random()-0.5);
    if(jumlahsoal>0 && hasil.length>jumlahsoal){
      //perkecil ukurannya
      hasil=hasil.slice(0,jumlahsoal);
    }

    //header dokumen: tags
    const p=outputbody.getChild(0).editAsText(); //paragraph pertama
    p.appendText("Soal-soal dengan kata kunci: "+keywords+"\rJumlah soal: "+hasil.length);
    p.setAttributes(standardstyle);
    outputbody.appendParagraph('');
    //ambil soal dari database dan taruh di tab output

    hasil.forEach((i,idx,ar)=>{
      outputbody.appendParagraph(String(idx+1)+'.').setAttributes(standardstyle);
      retrievefromindex(i,outputbody,withsolution);
      });
    //akhiran dokumen: waktu
    outputbody.appendParagraph('');
    const nowtime = Date.now();
    const nowstr=new Date(nowtime).toString();
    outputbody.appendParagraph("Disusun pada: " + nowstr + "\rOleh Bank Soal Astronomi").setAttributes(standardstyle);

    //duplicate hasilnya ke document untuk export
    const newbody=newdoc.getActiveTab().asDocumentTab();
    copytab(newbody,getTabByName(outputtabName).asDocumentTab());
  }
  if(outputtype=='pdf'){
    if(adahasil){
      ss=newdoc.getBlob().getBytes();
      //ss=newdoc.getAs('application/pdf').getBytes();
      //return ContentService.createTextOutput(Utilities.base64Encode(ss));
      outputstr=Utilities.base64Encode(ss);
    }
    else{ //hasilnya kosong tapi diminta pdf... jawab dengan text. nanti script di user side yang menghandle
      outputstr="Error - tidak ditemukan soal yang memenuhi kriteria.";
    }
  }
  else if(outputtype=='n'){ //hasilnya pasti angka, 0 atau positif
    outputstr=String(hasil);
  }
  else if(outputtype=='text'){
    if(count_only==0){ //kalau diminta soal-soalnya, berikan jumlahnya saja
      hasil=hasil.length;
    }
    if(hasil>0){
      outputstr = "Ditemukan " + hasil + " entry.\n";// + newdoc.getUrl();
    }
    else{
      outputstr = "Tidak ditemukan soal yang memenuhi kriteria.";
    }
  }
  //if(contenttype=="data"){ //return output text berisi daftar soal yang diminta, kalau ada.
  return ContentService
    .createTextOutput(outputstr)
    .setMimeType(ContentService.MimeType.TEXT);

  //else{ //return html page untuk user input untuk query selanjutnya
  //  return HtmlService.createHtmlOutputFromFile("index");
  //}
}
function doGet(e){
  return processRequest(e);
}
function testfunction(){
  //const doc = getTabByName(outputtabName).asDocumentTab();
  //const destbody=doc.getBody();
  //destbody.clear();
  //retrievefromindex(6,destbody,true);
  newrequest={
    parameters:{"tag":["bulan"],"n":["5"],"o":["n"]}
  };
  processRequest(newrequest);
}


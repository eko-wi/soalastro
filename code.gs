/*
urutan mengambil sebagian isi dokumen berdasarkan keywords
entry dimulai dengan
<<start>>
judul entry
<<tags>>
tag1,tag2,tag3
<<info>>
P (PG atau E untuk essay, atau kode huruf lainnya seperti ? untuk soal tidak jelas)
<<text>>
teks utama yang menyusun entry. Bisa termasuk images dan list.
<<end>>

*/
const outputdocID = "1A3aJwGTJlzPibVdlJJSBWf4Kzk-8Zc2M5nDo9ehYBnc";
const outputtabName = "output";
const databasetabname = "database";
const indextabname = "index";
const startKeyword = '<<start>>';
const endKeyword = '<<end>>';
const tagskeyword='<<tags>>';
const infokeyword='<<info>>';
const textkeyword='<<text>>';
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

function generateindex(){
  //jelajahi isi tab database dan hasilkan index di tab "index"
  const doc = getTabByName(databasetabname).asDocumentTab();
  const body=doc.getBody(); 
  const outputdoc = getTabByName(indextabname).asDocumentTab();
  const outputbody=outputdoc.getBody(); 
  outputbody.clear();
  let isWithinSegment = false;
  let foundStart = false;
  let ismatch=false;
  //const result=[];
  let titlestr="";
  let ititle=-1, istarttext=-1, iendtext=-1;
  let infostr="";
  let titleelement=null;
  let nmatches=0;
  //let textstartindex=0, textendindex=0;
  const numElements = body.getNumChildren();

  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    const type = element.getType();
    //console.log(i);
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      const text = element.getText();
      if(!foundStart&&text.includes(startKeyword)){
        //ambil elemen berikutnya
        ititle=i+1;
        titleelement=body.getChild(i+1);
        titlestr=titleelement.getText();
        if(titlestr.startsWith('<<')){ //tidak ada entry ini, langsung tags
          //titlestr="";
          //titleelement=null;
          ititle=-1;
        }     
        foundStart=true;
        nmatches++;
      }
      else if(foundStart&&text.includes(tagskeyword)){
        i++; //maju satu element, langsung baca
        tagstr=body.getChild(i).getText().replaceAll(' ', ''); //hilangkan semua spasi kalau ada
      }
      else if(foundStart&&text.includes(infokeyword)){
        i++;
        infostr=body.getChild(i).getText().replaceAll(' ', ''); //hilangkan semua spasi kalau ada
      }
      else if(foundStart&&text.includes(textkeyword)){
        istarttext=i+1; //catat indeks elemen yang merupakan awal teks
        isWithinSegment=true; 
      }
      else if(text.includes(endKeyword)){
          iendtext=i-1; //catat akhir indeks. teks diambil dari elemen ke-startindex sampai endindex
          if(isWithinSegment){
            outputbody.appendParagraph(tagstr);
            outputbody.appendParagraph(String(ititle));
            outputbody.appendParagraph(infostr);
            outputbody.appendParagraph(String(istarttext)+','+String(iendtext));
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
      //else if(isWithinSegment && (countonly==0)){
      //  //result.push(element.copy());
      //  outputbody.appendParagraph(element.copy());
      //}
    }
  }
  return nmatches;
}

function retrievefromindex(indexpos, destbody){
  const doc = getTabByName(databasetabname).asDocumentTab();
  const body=doc.getBody(); 
  const indexdoc = getTabByName(indextabname).asDocumentTab();
  const indexbody=indexdoc.getBody(); 
  //urutan pembacaan:
  //tags, berada di element ke-(indexpos)
  //ititle (index element title)
  //info
  //istarttext,iendtext

  //ambil title dari database, ditandai posisi element kesekian
  const ititle=+(indexbody.getChild(indexpos+1).getText());
  console.log(ititle);
  destbody.appendParagraph(body.getChild(ititle).copy());
  startend = indexbody.getChild(indexpos+3).getText().split(',');
  console.log(startend);
  //ambil element-element yang ditunjuk oleh istarttext sampai iendtext
  for(let i= +startend[0]; i <= +startend[1]; i++){
    console.log("copying element "+i);
    element = body.getChild(i);
    copyelement(element,destbody);
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
function findfromtags(qtagstr, method='ANY',countonly=0){
  //tag adalah string yang berisi beberapa kata yang dipisahkan koma
  const qtaglist=qtagstr.split(",");
  //const startKeyword = '<<start>>';
  //const endKeyword = '<<end>>';
  //const tagskeyword='<<tags>>';
  //const textkeyword='<<text>>';
  //export hasil search ke tab "output"
  //const doc = DocumentApp.getActiveDocument().getActiveTab().asDocumentTab();
  const doc = getTabByName(databasetabname).asDocumentTab();
  const body=doc.getBody(); 
  const outputdoc = getTabByName(outputtabName).asDocumentTab();
  const outputbody=outputdoc.getBody();
  outputbody.clear();
  let isWithinSegment = false;
  let foundStart = false;
  let ismatch=false;
  //const result=[];
  let titlestr="";
  let titleelement=null;
  let nmatches=0;

  const numElements = body.getNumChildren();

  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    const type = element.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH) {
      const text = element.getText();
      if(!foundStart&&text.includes(startKeyword)){
        //ambil elemen berikutnya
        titleelement=body.getChild(i+1);
        titlestr=titleelement.getText();
        if(titlestr.startsWith('<<')){ //tidak ada entry ini, langsung tags
          titlestr="";
          titleelement=null;
        }     
        foundStart=true;
      }
      else if(foundStart&&text.includes(tagskeyword)){
        i++;
        tagstr=body.getChild(i).getText().replaceAll(' ', ''); //hilangkan semua spasi kalau ada
        tagslist=tagstr.split(',');
        if(method=='ANY'){
          //cek apakah salah satu dari qtagslist ada dalam tagslist
          ismatch=qtaglist.some(r=>tagslist.includes(r));
        }
        else if(method=='ALL'){
          //cek apakah seluruh qtagslist ada dalam tagslist
          ismatch=qtaglist.every(r=>tagslist.includes(r));
        }
        if(ismatch){
          nmatches++;
          if((titleelement!=null) && (countonly==0)){
            //result.push(titleelement.copy());
            outputbody.appendParagraph(titleelement.copy());
          }
        }
      } //kalau tidak match, lanjut terus next elements
      else if(ismatch&&text.includes(textkeyword)){
        isWithinSegment=true; 
      }
      else if(text.includes(endKeyword)){
          //tambahkan paragraf kosong
          if(isWithinSegment && (countonly==0)){
            outputbody.appendParagraph("");
          }
          isWithinSegment=false;
          ismatch=false;
          foundStart=false;
          titleelement=null;
          
      }
      else if(isWithinSegment && (countonly==0)){
        //result.push(element.copy());
        outputbody.appendParagraph(element.copy());
      }
    }
    else if(type===DocumentApp.ElementType.INLINE_IMAGE){// type === DocumentApp.ElementType.TABLE){
       if (isWithinSegment && (countonly==0)) {
        //result.push(element.copy());
        outputbody.appendImage(element.copy());
      }
    }
    else if(type === DocumentApp.ElementType.TABLE){
       if (isWithinSegment && (countonly==0)) {
        //result.push(element.copy());
        outputbody.appendTable(element.copy());
       }
    }
    else if(type===DocumentApp.ElementType.LIST_ITEM){
       if (isWithinSegment && (countonly==0)) {
        //result.push(element.copy());
        L = outputbody.appendListItem(element.copy());
        L.setGlyphType(element.getGlyphType());
      }
    }

  }
  return nmatches;
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
function doGet(e) {
  //serve text
  // https://developers.google.com/apps-script/guides/content
  //serve HTML
  //https://developers.google.com/apps-script/guides/web
  //structure of a document
  //https://developers.google.com/apps-script/guides/docs

  //baca url parameters
  var f = e.parameters['find'];
  var t = e.parameters['tag'];
  var m = e.parameters['m']; //methods, any atau all
  var tipesoal = e.parameters['t']; //'p' untuk PG atau 'e' untuk essay atau kosongkan untuk keduanya
  var outputtype = e.parameters['o']; //text atau pdf atau entah apa?
  var keywords='';
  var hasil=0;
  var outputstr="No result or error.";
  var contenttype="html";
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
  if(typeof(f)!=='undefined' && f.length>0){
    keywords=f[0];
    hasil=findmention(keywords);
    //return ContentService.createTextOutput(hasil);
    outputstr=String(hasil);
  }
  else if(typeof(t)!=='undefined' && t.length>0){
    contenttype="data";
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
    hasil=findfromtags(keywords,method,count_only); 
    //output ke tab "output"
    if(hasil>0){
      if(outputtype=="pdf"){
        var newdoc;
        /*
        files=DriveApp.getFilesByName(resfilename); //<-- error perlu permission??
        if(files.hasNext()){
          docid=files.next().getId();
          newdoc=DocumentApp.openbyId(docid);
          //clear
          newdoc.getActiveTab().asDocumentTab().getBody().clear();
        }
        else{
          newdoc=DocumentApp.create("docreader output");
        }
        */
        newdoc=DocumentApp.openById(outputdocID);
        const newbody=newdoc.getActiveTab().asDocumentTab();
        copytab(newbody,getTabByName(outputtabName).asDocumentTab());
        ss=newdoc.getBlob().getBytes();
        //ss=newdoc.getAs('application/pdf').getBytes();
        //return ContentService.createTextOutput(Utilities.base64Encode(ss));
        outputstr=Utilities.base64Encode(ss);
      }
      else if(outputtype='n'){
        //return ContentService.createTextOutput(String(hasil));
        outputstr=String(hasil);
      }
      else{ //outputtype = txt
        outputstr = "Ditemukan " + hasil + " entry.\n" + getTabUrl(outputtabName);
        //return ContentService.createTextOutput(strhasil + getTabUrl(outputtabName));
      }
    }
    else{
      if(outputtype=='n' || outputtype=='pdf'){
        outputstr='0';
        //return ContentService.createTextOutput("Tidak ditemukan.");
      }
      else{
        outputstr="Tidak ditemukan";
      }
      //return ContentService.createTextOutput("Tidak ditemukan.");
    }
  }
  if(contenttype=="data"){ //return output text berisi daftar soal yang diminta, kalau ada.
  return ContentService
    .createTextOutput(outputstr)
    .setMimeType(ContentService.MimeType.TEXT);
  }
  else{ //return html page untuk user input untuk query selanjutnya
    return HtmlService.createHtmlOutputFromFile("index");
  }
}

function testfunction(){
  const doc = getTabByName(outputtabName).asDocumentTab();
  const destbody=doc.getBody();
  destbody.clear();
  retrievefromindex(5,destbody);
}

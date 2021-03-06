var pic;
var widthPic = 200,
    heightPic = 400;
var context = {};

function reset() {
    var sections = document.getElementsByTagName('section');
    for (i = 1; i < 4; i++) {
        sections[i].style.display = 'none';
    }
    removeAllLegendLabels(document);
    document.getElementById('trackBar').value = 50;
    document.getElementById('settingRoundingH2').innerHTML = 'Rounding: 50px';
}

function removeAllLegendLabels(elem) {
    var inscriptions = elem.getElementsByClassName('inscription'),
        insLen = inscriptions.length;
    if (inscriptions[0] != null) {
        for (i = insLen - 1; i >= 0; i--) {
            inscriptions[i].remove();
        }    
    }
}

window.onload = function() {
    document.getElementById('sectionOriginal').style.display = 'none';
    reset();
}

function getCtx(nameId, num) {
    var elem = document.getElementById(nameId);
    elem.setAttributeNS(null, 'width', widthPic);
    elem.setAttributeNS(null, 'height', heightPic);

    context[num] = elem.getContext('2d');
}

var loadImageFile = (function () {
    var	pic = null, oFReader = new window.FileReader(),
        rFilter = /^(?:image\/bmp|image\/cis\-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x\-cmu\-raster|image\/x\-cmx|image\/x\-icon|image\/x\-portable\-anymap|image\/x\-portable\-bitmap|image\/x\-portable\-graymap|image\/x\-portable\-pixmap|image\/x\-rgb|image\/x\-xbitmap|image\/x\-xpixmap|image\/x\-xwindowdump)$/i;

    oFReader.onload = function (oFREvent) {
        if (!pic) {
            pic = new Image();
            document.getElementById('sectionOriginal').style.display = 'block';
        }
        pic.src = oFREvent.target.result;
        pic.onload = function () {
            var aWidth = document.body.clientWidth - 60;
            console.log(aWidth);
            widthPic = (pic.width < aWidth - 1) ? pic.width % 2 ? pic.width - 1 // по-тихому меняет размеры изображения,
                                                            : pic.width     // чтобы они были четными
                                            : aWidth;
            heightPic = pic.height;

            reset();

            // установка размеров канвас в зависимости от размеров картинки 
            getCtx('original', 0);                 // получение контекста всех канвасов на странице
            var i;
            for (i = 1; i < 4; i++) {
                getCtx('DirectConversion' + i, (i - 1) * 3 + 1);   // канвас, отображающий суммы и разности после квантования
                getCtx('InvertConversion' + i, (i - 1) * 3 + 2);   // обратное преобразование картинки
                getCtx('heatmap' + i, (i - 1) * 3 + 3);            // тепловая карта исходника и сжатногго изображения
            }
            context[0].drawImage(pic, 0, 0, widthPic, heightPic, 0, 0, widthPic, heightPic);
            getGreyImages(context[0]);
        }
    };

    return function () {
        var aFiles = document.getElementById('imageInput').files;
        if (aFiles.length === 0) { return; }
        if (!rFilter.test(aFiles[0].type)) { alert('You must select a valid image file!'); return; }
        oFReader.readAsDataURL(aFiles[0]);
    }
})();

function downloadImg(num){
    document.getElementById('downloader'+num).download = '123.png';
    document.getElementById('downloader'+num).href = document.getElementById('InvertConversion'+num).toDataURL('image/png').replace(/^data:image\/[^;]/, 'data:application/octet-stream');
}

function downloadOriginal() {
    document.getElementById('downloader0').download = '123.png';
    document.getElementById('downloader0').href = document.getElementById('original').toDataURL('image/png').replace(/^data:image\/[^;]/, 'data:application/octet-stream');
}

function getGreyImages(ctx) {
    
    var colorToGrey = function(red, green, blue) {
        return Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
    }
    var imgData = ctx.getImageData(0, 0, widthPic, heightPic);
    var pixColor;

    for (var i=0; i<imgData.data.length; i+=4) {
        pixColor = colorToGrey(imgData.data[i], imgData.data[i+1], imgData.data[i+2]);
        imgData.data[i] = pixColor;
        imgData.data[i+1] = pixColor;
        imgData.data[i+2] = pixColor;
    }
    ctx.putImageData(imgData, 0, 0);
}

function setPixel(imageData, i, value) { // установка значения value в пиксель, начиная с индекса i
    imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = value;
    imageData.data[i + 3] = 255;
}

function compression(quantum, OimgData, DCimgData, ICimgData) { // сжатие изображения
    var maxDif = 0; // наибольша разница пикселей
    var n = OimgData.data.length; // количество ячеек массива с картинкой (кол-во пикселей *4)
    var mass = new Array(n / 4); // массив по кол-ву пикселей картинки

    var halfStrLen = n / heightPic / 2, // половина ширины изовражения *4
        nStr = n / heightPic; // ширина изображения *4 (+ кол-во обработанных строк * шир. изобр. *4)
    var j,               // для прохода по оригиналу
        j1 = 0,          // по изображению с суммами и разницами
        j2 = halfStrLen;

    var comparison = function(i) {
        var dif = Math.abs(ICimgData.data[i] - OimgData.data[i]);
        if( dif > maxDif) {
            maxDif = dif;
        }
    };

    for (var i = 0; i < heightPic; i++) {
        j1 = i * halfStrLen * 2; // индекс начала i-ой строки
        j2 = j1 + halfStrLen;   // индекс середины i-ой строки
        for (j = j1; j < nStr; j += 8) { // через каждые 2 пикселя по оригиналу
            var res = Math.round((OimgData.data[j] - OimgData.data[j + 4]) / 2);
            mass[j1 / 4] = Math.round((OimgData.data[j] + OimgData.data[j + 4]) / 2); // сохранить значение пикселей во вспомогательный массив
            mass[j2 / 4] = Math.abs(res) <= quantum ? 0
                                          : res;

            setPixel(DCimgData, j1, mass[j1 / 4]); // отображение суммы на канвасе
            setPixel(DCimgData, j2, Math.abs(mass[j2 / 4])); // отображение разности на канвасе
            setPixel(ICimgData, j, mass[j1 / 4] + mass[j2 / 4]); // первый пиксель сжатого изображения
            setPixel(ICimgData, j + 4, mass[j1 / 4] - mass[j2 / 4]); // второй пиксель сжатого изображения
            comparison(j);      // нахождение максимальной разности пикселей исходного и сжатого изображений
            comparison(j + 4);  // для тепловой карты

            j1 += 4;
            j2 += 4;
        }
        nStr += n / heightPic;
    }
    return maxDif;
}

function setColorsInSegment(s, e, channel, color, ColorGetValue, clrS, clrIndex, legendCtx, legendColors) {
    var addColor = function(color, mass, i, startPos) {
        mass[i] = {
            0: color[0],
            1: color[1],
            2: color[2],
            3: startPos
        }
    }
    var step = (e - s) / clrS;

    var i = 1,
        sS = s, // кондинаты начала цвета
        eS = Math.floor(i * step) + s; // координаты конца

    addColor(color, legendColors, clrIndex++, sS);
    legendCtx.fillStyle = 'rgba('+color[0]+','+color[1]+','+color[2]+')'; // назначить полученный цвет для заливки
    legendCtx.fillRect(0, sS, 10, eS - sS + 1); // закрасить кусочек на легенде
    i++;
    while(i <= clrS) {
        sS = eS + 1;
        eS = Math.floor(i * step) + s;

        color[channel] = ColorGetValue(i, clrS); // увеличить значение для данного цветового канала
        addColor(color, legendColors, clrIndex++, sS); // добавить полученный цвет в массив
        legendCtx.fillStyle = 'rgba('+color[0]+','+color[1]+','+color[2]+')'; // назначить полученный цвет для заливки
        legendCtx.fillRect(0, sS, 10, eS - sS + 1); // закрасить кусочек на легенде
        i++;
    }
    if (e != eS) { // если произошла ошибка округления
        legendCtx.fillRect(0, eS + 1, 10, e - eS); // закрасить кусочек на легенде
    }
}

function setLegendLabels(iteration, legendHeight, legendColors) {
    var box = document.getElementById('legendBox'+iteration);
    var ins;
    if(legendHeight < 80) {
        ins = document.createElement('div');
        ins.className = 'inscription';
        ins.style.top = '0';
        ins.appendChild(document.createTextNode('0 - '+legendColors.length - 1));
        box.appendChild(ins);
        return;
    }

    var colorN = legendColors.length,
        step   = Math.ceil(40 / (legendHeight / colorN)),
        iterations = Math.ceil(colorN / step) - 1,
        x = 0;

    for (var i = 0; i < iterations; i++) {
        ins = document.createElement('div');
        ins.className = 'inscription';
        ins.style.top = legendColors[x][3].toString()+'px';
        ins.appendChild(document.createTextNode(x));
        box.appendChild(ins);
        x += step;
    }
    x = colorN - 1;
    ins = document.createElement('div');
    ins.className = 'inscription';
    ins.style.top = legendColors[x][3].toString()+'px';
    ins.appendChild(document.createTextNode(x));
    box.appendChild(ins);
}

function legendException(maxDif, legendCtx, legendHeight, legendColors) {
    var addColor = function(color, mass, i, startPos) {
        mass[i] = {
            0: color[0],
            1: color[1],
            2: color[2],
            3: startPos
        }
    }
    var color = {
        0: 255,
        1: 100,
        2: 100
    };
    switch (maxDif) {
        case 0:
            addColor(color, legendColors, 0, 0);
            legendCtx.fillStyle = 'rgba(255, 100, 100)'; // назначить полученный цвет для заливки
            legendCtx.fillRect(0, 0, 10, legendHeight); // закрасить кусочек на легенде
            break;
        case 1:
            var h2 = Math.floor(legendHeight / 2);
            addColor(color, legendColors, 0, 0);
            legendCtx.fillStyle = 'rgba(255, 100, 100)'; // назначить полученный цвет для заливки
            legendCtx.fillRect(0, 0, 10, h2); // закрасить кусочек на легенде
            color[0] = 100;
            color[2] = 255;
            addColor(color, legendColors, 1, h2);
            legendCtx.fillStyle = 'rgba(100, 100, 255)'; // назначить полученный цвет для заливки
            legendCtx.fillRect(0, h2, 10, legendHeight - h2); // закрасить кусочек на легенде
            break;
        case 2:
            var h3 = Math.floor(legendHeight / 3);
            addColor(color, legendColors, 0, 0);
            legendCtx.fillStyle = 'rgba(255, 100, 100)'; // назначить полученный цвет для заливки
            legendCtx.fillRect(0, 0, 10, h3); // закрасить кусочек на легенде
            color[0] = 100;
            color[1] = 255;
            addColor(color, legendColors, 1, h3);
            legendCtx.fillStyle = 'rgba(100, 255, 100)'; // назначить полученный цвет для заливки
            legendCtx.fillRect(0, h3, 10, h3); // закрасить кусочек на легенде
            color[1] = 100;
            color[2] = 255;
            addColor(color, legendColors, 2, h3 * 2);
            legendCtx.fillStyle = 'rgba(100, 100, 255)'; // назначить полученный цвет для заливки
            legendCtx.fillRect(0, h3 * 2, 10, legendHeight - h3 * 2); // закрасить кусочек на легенде

    }
}

function getLegend(maxDif, legendCtx, legendHeight, legendColors) {
    if (maxDif < 3) {
        legendException(maxDif, legendCtx, legendHeight, legendColors);
        return;
    }
    var colorN = maxDif + 1,
        clr4 = (maxDif + 1) / 4;
    var i = 1,
        channel = 1, // green
        clrS = Math.floor(clr4 * i), // кол-во цветов задаваемых данным сегментом
        clrR = 0, // кол-во заданных цветов
        s = 0, // начало сегмента
        e = Math.floor((clrS + clrR) / colorN * legendHeight); // конец сегмента

    var incColorGetValue = function(n, per) {
        return Math.round(155 * n / per) + 100;
    }
    var decColorGetValue = function(n, per) {
        return 255 - Math.round(n * 155 / per);
    }

    var color = {
        0: 255,
        1: 100,
        2: 100
    };
    
    while (i <= 4) {
        setColorsInSegment(s, 
                           e, 
                           channel, 
                           color,
                           i % 2 ? incColorGetValue
                                 : decColorGetValue,
                           clrS,
                           clrR,
                           legendCtx,
                           legendColors);
        color[channel] = i % 2 ? 255 : 100;
        i++;
        channel = (channel + 2) % 3;
        clrR += clrS;
        clrS = Math.floor(clr4 * i) - clrR;
        s = e + 1;
        e = Math.floor((clrS + clrR) / colorN * legendHeight);
        color[channel] = i % 2 ? incColorGetValue(1, clrS)
                               : decColorGetValue(1, clrS); // увеличить значение для данного цветового канала
    }
}

function setHeatmapAccordingToLegend(HMimgData, oImgData, ICimgData, legendColors) {
    var n = oImgData.data.length,
        dif,
        i = 0;
    var setColor = function() {
        HMimgData.data[i] = legendColors[dif][0];
        HMimgData.data[i+1] = legendColors[dif][1];
        HMimgData.data[i+2] = legendColors[dif][2];
        HMimgData.data[i+3] = 255;
    }

    for (; i < n; i += 4) {
        dif = Math.abs(oImgData.data[i] - ICimgData.data[i]);
        setColor();
    }
}

function getHeatmap(iteration, maxDif, HMimgData, oImgData, ICimgData, legendCtx, legendHeight) { // получение тепловой карты
    var legendColors = new Array(maxDif + 1);
    getLegend(maxDif, legendCtx, legendHeight, legendColors);
    setHeatmapAccordingToLegend(HMimgData, oImgData, ICimgData, legendColors);
    setLegendLabels(iteration, legendHeight, legendColors);
}

function onChangeTrackBar() 
{
    var quantum = parseInt(document.getElementById('trackBar').value);
    document.getElementById('settingRoundingH2').innerHTML = 'Rounding: '+quantum+'px';
    removeAllLegendLabels(document.getElementById('legendBox3'));
    conversion(2, quantum);
}

function conversion(iteration, quantum) { // ф-ия по нажатию кнопки получения сжатого изобр. и тепловой карты
    iteration *= 3;
    if (   !context[0] // проверка, есть ли все контексты в массиве
        || !context[iteration + 1.0] 
        || !context[iteration + 2.0] 
        || !context[iteration + 3.0] ) { // если чего-то нет, вывод сообщения об ошибке в консоль
            console.log('Have no context', 0, iteration + 1, iteration + 2, iteration + 3);
            return;
    }
    
    var DCimgData = context[iteration + 1.0].getImageData(0, 0, widthPic, heightPic),
        ICimgData = context[iteration + 2.0].getImageData(0, 0, widthPic, heightPic);

    var maxDif = compression(quantum, 
                             context[0].getImageData(0, 0, widthPic, heightPic), 
                             DCimgData, 
                             ICimgData);
    context[iteration + 1.0].putImageData(DCimgData, 0, 0);
    context[iteration + 2.0].putImageData(ICimgData, 0, 0);

    var legend = document.getElementById('legend'+(iteration / 3 + 1));
    var legendHeight = heightPic < maxDif ? maxDif 
                                          : heightPic;
    legend.setAttributeNS(null, 'width', '10');
    legend.setAttributeNS(null, 'height', legendHeight.toString());

    var HMimgData = context[iteration + 3.0].getImageData(0, 0, widthPic, heightPic),
        legendCtx = legend.getContext('2d');

    getHeatmap(iteration / 3 + 1,
               maxDif, 
               HMimgData,
               context[0].getImageData(0, 0, widthPic, heightPic),
               context[iteration + 2.0].getImageData(0, 0, widthPic, heightPic),
               legendCtx,
               legendHeight);
    context[iteration + 3.0].putImageData(HMimgData, 0, 0);
    console.log('sectionConversion'+(iteration / 3 + 1));
    document.getElementById('sectionConversion'+(iteration / 3 + 1)).style.display = 'block';
}
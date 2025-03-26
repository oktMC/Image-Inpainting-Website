window.onload = function() {
    colorThreshold = 15;
    blurRadius = 5;
    simplifyTolerant = 0;
    simplifyCount = 30;
    hatchLength = 4;
    hatchOffset = 0;

    imageInfo = null;
    cacheInd = null;
    mask = null;
    oldMask = null;
    downPoint = null;
    allowDraw = false;
    addMode = false;
    currentThreshold = colorThreshold;
    mode = null // 0:grayscale mode, 1:COLOR mode
    setInterval(function () { hatchTick(); }, 300);
}


// function uploadClick() {
//     document.getElementById("file-upload").click();
// }

function onRadiusChange(e) {
    blurRadius = e.target.value;
}

// function imgChange (inp) {
//     if (inp.files && inp.files[0]) {
//         var reader = new FileReader();
//         reader.onload = function (e) {
//             var img = document.getElementById("image-preview");
//             img.setAttribute('src', e.target.result);
//             img.onload = function() {
//                 window.initCanvas(img);
//             };
//         }
//         reader.readAsDataURL(inp.files[0]);
//     }
// }

function initCanvas(img) {
    var cvs = document.getElementById("resultCanvas");
    cvs.width = img.width;
    cvs.height = img.height;
    imageInfo = {
        width: img.width,
        height: img.height,
        context: cvs.getContext("2d")
    };
    mask = null;
    
    var tempCtx = document.createElement("canvas").getContext("2d");
    tempCtx.canvas.width = imageInfo.width;
    tempCtx.canvas.height = imageInfo.height;
    tempCtx.drawImage(img, 0, 0);
    imageInfo.data = tempCtx.getImageData(0, 0, imageInfo.width, imageInfo.height);
}

function getMousePosition(e) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    return { x, y };
}

function onMouseDown(e) {
    if (e.button == 0) {
        allowDraw = true;
        addMode = e.ctrlKey;
        downPoint = getMousePosition(e);
        drawMask(downPoint.x, downPoint.y);
    } else { 
    		allowDraw = false;
        addMode = false;
        oldMask = null;
    }
}
function onMouseMove(e) {
    if (allowDraw) {
        var p = getMousePosition(e);
        if (p.x != downPoint.x || p.y != downPoint.y) {
            var dx = p.x - downPoint.x,
                dy = p.y - downPoint.y,
                len = Math.sqrt(dx * dx + dy * dy),
                adx = Math.abs(dx),
                ady = Math.abs(dy),
                sign = adx > ady ? dx / adx : dy / ady;
            sign = sign < 0 ? sign / 5 : sign / 3;
            var thres = Math.min(Math.max(colorThreshold + Math.floor(sign * len), 1), 255);
            //var thres = Math.min(colorThreshold + Math.floor(len / 3), 255);
            if (thres != currentThreshold) {
                currentThreshold = thres;
                drawMask(downPoint.x, downPoint.y);
            }
        }
    }
}
function onMouseUp(e) {
    allowDraw = false;
    addMode = false;
    oldMask = null;
    currentThreshold = colorThreshold;
}

function drawMask(x, y) {
    if (!imageInfo) return;
    
    var image = {
        data: imageInfo.data.data,
        width: imageInfo.width,
        height: imageInfo.height,
        bytes: 4
    };
    
    if (addMode && !oldMask) {
    	oldMask = mask;
    }
    
    let old = oldMask ? oldMask.data : null;
    
    mask = MagicWand.floodFill(image, x, y, currentThreshold, old, true);
    if (mask) mask = MagicWand.gaussBlurOnlyBorder(mask, blurRadius, old);
    
    if (addMode && oldMask) {
    	mask = mask ? concatMasks(mask, oldMask) : oldMask;
    }
    
    drawBorder();
}
function hatchTick() {
    hatchOffset = (hatchOffset + 1) % (hatchLength * 2);
    drawBorder(true);
}
function drawBorder(noBorder) {
    if (!mask) return;
    
    var x,y,i,j,k,
        w = imageInfo.width,
        h = imageInfo.height,
        ctx = imageInfo.context,
        imgData = ctx.createImageData(w, h),
        res = imgData.data;
    
    if (!noBorder) cacheInd = MagicWand.getBorderIndices(mask);
    
    ctx.clearRect(0, 0, w, h);
    
    var len = cacheInd.length;
    for (j = 0; j < len; j++) {
        i = cacheInd[j];
        x = i % w; // calc x by index
        y = (i - x) / w; // calc y by index
        k = (y * w + x) * 4; 
        if ((x + y + hatchOffset) % (hatchLength * 2) < hatchLength) { // detect hatch color 
            res[k + 3] = 255; // black, change only alpha
        } else {
            res[k] = 255; // white
            res[k + 1] = 255;
            res[k + 2] = 255;
            res[k + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

function hexToRgb(hex, alpha) {
  var int = parseInt(hex, 16);
  var r = (int >> 16) & 255;
  var g = (int >> 8) & 255;
  var b = int & 255;

  return [r,g,b, Math.round(alpha * 255)];
}
function concatMasks(mask, old) {
	let 
  	data1 = old.data,
		data2 = mask.data,
		w1 = old.width,
		w2 = mask.width,
		b1 = old.bounds,
		b2 = mask.bounds,
		b = { // bounds for new mask
			minX: Math.min(b1.minX, b2.minX),
			minY: Math.min(b1.minY, b2.minY),
			maxX: Math.max(b1.maxX, b2.maxX),
			maxY: Math.max(b1.maxY, b2.maxY)
		},
		w = old.width, // size for new mask
		h = old.height,
		i, j, k, k1, k2, len;

	let result = new Uint8Array(w * h);

	// copy all old mask
	len = b1.maxX - b1.minX + 1;
	i = b1.minY * w + b1.minX;
	k1 = b1.minY * w1 + b1.minX;
	k2 = b1.maxY * w1 + b1.minX + 1;
	// walk through rows (Y)
	for (k = k1; k < k2; k += w1) {
		result.set(data1.subarray(k, k + len), i); // copy row
		i += w;
	}

	// copy new mask (only "black" pixels)
	len = b2.maxX - b2.minX + 1;
	i = b2.minY * w + b2.minX;
	k1 = b2.minY * w2 + b2.minX;
	k2 = b2.maxY * w2 + b2.minX + 1;
	// walk through rows (Y)
	for (k = k1; k < k2; k += w2) {
		// walk through cols (X)
		for (j = 0; j < len; j++) {
			if (data2[k + j] === 1) result[i + j] = 1;
		}
		i += w;
	}

	return {
		data: result,
		width: w,
		height: h,
		bounds: b
	};
}





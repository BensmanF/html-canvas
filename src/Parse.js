_html2canvas.Parse = function (images, options) {
  window.scroll(0,0);

  var element = (( options.elements === undefined ) ? document.body : options.elements[0]), // select body by default
  numDraws = 0,
  doc = element.ownerDocument,
  support = _html2canvas.Util.Support(options, doc),
  ignoreElementsRegExp = new RegExp("(" + options.ignoreElements + ")"),
  body = doc.body,
  getCSS = _html2canvas.Util.getCSS;

  images = images || {};

  function documentWidth () {
    return Math.max(
      Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth),
      Math.max(doc.body.offsetWidth, doc.documentElement.offsetWidth),
      Math.max(doc.body.clientWidth, doc.documentElement.clientWidth)
      );
  }

  function documentHeight () {
    return Math.max(
      Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight),
      Math.max(doc.body.offsetHeight, doc.documentElement.offsetHeight),
      Math.max(doc.body.clientHeight, doc.documentElement.clientHeight)
      );
  }

  function getCSSInt(element, attribute) {
    var val = parseInt(getCSS(element, attribute), 10);
    return (isNaN(val)) ? 0 : val; // borders in old IE are throwing 'medium' for demo.html
  }

  function renderRect (ctx, x, y, w, h, bgcolor) {
    if (bgcolor !== "transparent"){
      ctx.setVariable("fillStyle", bgcolor);
      ctx.fillRect(x, y, w, h);
      numDraws+=1;
    }
  }

  function textTransform (text, transform) {
    switch(transform){
      case "lowercase":
        return text.toLowerCase();
      case "capitalize":
        return text.replace( /(^|\s|:|-|\(|\))([a-z])/g , function (m, p1, p2) {
          if (m.length > 0) {
            return p1 + p2.toUpperCase();
          }
        } );
      case "uppercase":
        return text.toUpperCase();
      default:
        return text;
    }
  }

  function noLetterSpacing(letter_spacing) {
    return (/^(normal|none|0px)$/.test(letter_spacing));
  }

  function drawText(currentText, x, y, ctx){
    if (currentText !== null && _html2canvas.Util.trimText(currentText).length > 0) {
      ctx.fillText(currentText, x, y);
      numDraws+=1;
    }
  }

  function setTextVariables(ctx, el, text_decoration, color) {
    var align = false,
    bold = getCSS(el, "fontWeight"),
    family = getCSS(el, "fontFamily"),
    size = getCSS(el, "fontSize");

    switch(parseInt(bold, 10)){
      case 401:
        bold = "bold";
        break;
      case 400:
        bold = "normal";
        break;
    }

    ctx.setVariable("fillStyle", color);
    ctx.setVariable("font", [getCSS(el, "fontStyle"), getCSS(el, "fontVariant"), bold, size, family].join(" "));
    ctx.setVariable("textAlign", (align) ? "right" : "left");

    if (text_decoration !== "none"){
      return _html2canvas.Util.Font(family, size, doc);
    }
  }

  function renderTextDecoration(ctx, text_decoration, bounds, metrics, color) {
    switch(text_decoration) {
      case "underline":
        // Draws a line at the baseline of the font
        // TODO As some browsers display the line as more than 1px if the font-size is big, need to take that into account both in position and size
        renderRect(ctx, bounds.left, Math.round(bounds.top + metrics.baseline + metrics.lineWidth), bounds.width, 1, color);
        break;
      case "overline":
        renderRect(ctx, bounds.left, Math.round(bounds.top), bounds.width, 1, color);
        break;
      case "line-through":
        // TODO try and find exact position for line-through
        renderRect(ctx, bounds.left, Math.ceil(bounds.top + metrics.middle + metrics.lineWidth), bounds.width, 1, color);
        break;
    }
  }

  function getTextBounds(state, text, textDecoration, isLast) {
    var bounds;
    if (support.rangeBounds) {
      if (textDecoration !== "none" || _html2canvas.Util.trimText(text).length !== 0) {
        bounds = textRangeBounds(text, state.node, state.textOffset);
      }
      state.textOffset += text.length;
    } else if (state.node && typeof state.node.nodeValue === "string" ){
      var newTextNode = (isLast) ? state.node.splitText(text.length) : null;
      bounds = textWrapperBounds(state.node);
      state.node = newTextNode;
    }
    return bounds;
  }

  function textRangeBounds(text, textNode, textOffset) {
    var range = doc.createRange();
    range.setStart(textNode, textOffset);
    range.setEnd(textNode, textOffset + text.length);
    return range.getBoundingClientRect();
  }

  function textWrapperBounds(oldTextNode) {
    var parent = oldTextNode.parentNode,
    wrapElement = doc.createElement('wrapper'),
    backupText = oldTextNode.cloneNode(true);

    wrapElement.appendChild(oldTextNode.cloneNode(true));
    parent.replaceChild(wrapElement, oldTextNode);

    var bounds = _html2canvas.Util.Bounds(wrapElement);
    parent.replaceChild(backupText, wrapElement);
    return bounds;
  }

  function renderText(el, textNode, stack) {
    var ctx = stack.ctx,
    color = getCSS(el, "color"),
    textDecoration = getCSS(el, "textDecoration"),
    textAlign = getCSS(el, "textAlign"),
    metrics,
    textList,
    state = {
      node: textNode,
      textOffset: 0
    };

    if (_html2canvas.Util.trimText(textNode.nodeValue).length > 0) {
      textNode.nodeValue = textTransform(textNode.nodeValue, getCSS(el, "textTransform"));
      textAlign = textAlign.replace(["-webkit-auto"],["auto"]);

      textList = (!options.letterRendering && /^(left|right|justify|auto)$/.test(textAlign) && noLetterSpacing(getCSS(el, "letterSpacing"))) ?
      textNode.nodeValue.split(/(\b| )/)
      : textNode.nodeValue.split("");

      metrics = setTextVariables(ctx, el, textDecoration, color);

      textList.forEach(function(text, index) {
        var bounds = getTextBounds(state, text, textDecoration, (index < textList.length - 1));
        if (bounds) {
          drawText(text, bounds.left, bounds.bottom, ctx);
          renderTextDecoration(ctx, textDecoration, bounds, metrics, color);
        }
      });
    }
  }

  function listPosition (element, val) {
    var boundElement = doc.createElement( "boundelement" ),
    originalType,
    bounds;

    boundElement.style.display = "inline";

    originalType = element.style.listStyleType;
    element.style.listStyleType = "none";

    boundElement.appendChild(doc.createTextNode(val));

    element.insertBefore(boundElement, element.firstChild);

    bounds = _html2canvas.Util.Bounds(boundElement);
    element.removeChild(boundElement);
    element.style.listStyleType = originalType;
    return bounds;
  }

  function elementIndex( el ) {
    var i = -1,
    count = 1,
    childs = el.parentNode.childNodes;

    if (el.parentNode) {
      while( childs[ ++i ] !== el ) {
        if ( childs[ i ].nodeType === 1 ) {
          count++;
        }
      }
      return count;
    } else {
      return -1;
    }
  }

  function listItemText(element, type) {
    var currentIndex = elementIndex(element),
    text;
    switch(type){
      case "decimal":
        text = currentIndex;
        break;
      case "decimal-leading-zero":
        text = (currentIndex.toString().length === 1) ? currentIndex = "0" + currentIndex.toString() : currentIndex.toString();
        break;
      case "upper-roman":
        text = _html2canvas.Generate.ListRoman( currentIndex );
        break;
      case "lower-roman":
        text = _html2canvas.Generate.ListRoman( currentIndex ).toLowerCase();
        break;
      case "lower-alpha":
        text = _html2canvas.Generate.ListAlpha( currentIndex ).toLowerCase();
        break;
      case "upper-alpha":
        text = _html2canvas.Generate.ListAlpha( currentIndex );
        break;
    }

    text += ". ";
    return text;
  }

  function renderListItem(element, stack, elBounds) {
    var x,
    text,
    ctx = stack.ctx,
    type = getCSS(element, "listStyleType"),
    listBounds;

    if (/^(decimal|decimal-leading-zero|upper-alpha|upper-latin|upper-roman|lower-alpha|lower-greek|lower-latin|lower-roman)$/i.test(type)) {
      text = listItemText(element, type);
      listBounds = listPosition(element, text);
      setTextVariables(ctx, element, "none", getCSS(element, "color"));

      if (getCSS(element, "listStylePosition") === "inside") {
        ctx.setVariable("textAlign", "left");
        x = elBounds.left;
      } else {
        return;
      }

      drawText(text, x, listBounds.bottom, ctx);
    }
  }

  function loadImage (src){
    var img = images[src];
    if (img && img.succeeded === true) {
      return img.img;
    } else {
      return false;
    }
  }

  function clipBounds(src, dst){
    var x = Math.max(src.left, dst.left),
    y = Math.max(src.top, dst.top),
    x2 = Math.min((src.left + src.width), (dst.left + dst.width)),
    y2 = Math.min((src.top + src.height), (dst.top + dst.height));

    return {
      left:x,
      top:y,
      width:x2-x,
      height:y2-y
    };
  }

  function setZ(zIndex, parentZ){
    // TODO fix static elements overlapping relative/absolute elements under same stack, if they are defined after them
    var newContext;
    if (!parentZ){
      newContext = h2czContext(0);
      return newContext;
    }

    if (zIndex !== "auto"){
      newContext = h2czContext(zIndex);
      parentZ.children.push(newContext);
      return newContext;

    }

    return parentZ;
  }

  function renderImage(ctx, element, image, bounds, borders) {

    var paddingLeft = getCSSInt(element, 'paddingLeft'),
    paddingTop = getCSSInt(element, 'paddingTop'),
    paddingRight = getCSSInt(element, 'paddingRight'),
    paddingBottom = getCSSInt(element, 'paddingBottom');

    drawImage(
      ctx,
      image,
      0, //sx
      0, //sy
      image.width, //sw
      image.height, //sh
      bounds.left + paddingLeft + borders[3].width, //dx
      bounds.top + paddingTop + borders[0].width, // dy
      bounds.width - (borders[1].width + borders[3].width + paddingLeft + paddingRight), //dw
      bounds.height - (borders[0].width + borders[2].width + paddingTop + paddingBottom) //dh
      );
  }

  function renderBorders(el, ctx, bounds, clip){
    var x = bounds.left,
    y = bounds.top,
    w = bounds.width,
    h = bounds.height,
    borderSide,
    borderData,
    bx,
    by,
    bw,
    bh,
    i,
    borderArgs,
    borderBounds,
    borders = (function(el){
      var borders = [],
      sides = ["Top","Right","Bottom","Left"],
      s;

      for (s = 0; s < 4; s+=1){
        borders.push({
          width: getCSSInt(el, 'border' + sides[s] + 'Width'),
          color: getCSS(el, 'border' + sides[s] + 'Color')
        });
      }

      return borders;

    }(el)),
    // http://www.w3.org/TR/css3-background/#the-border-radius
    borderRadius = (function( el ) {
      var borders = [],
      sides = ["TopLeft","TopRight","BottomRight","BottomLeft"],
      s;

      for (s = 0; s < 4; s+=1){
        borders.push( getCSS(el, 'border' + sides[s] + 'Radius') );
      }

      return borders;
    })( el );



    for ( borderSide = 0; borderSide < 4; borderSide+=1 ) {
      borderData = borders[ borderSide ];
      borderArgs = [];
      if (borderData.width>0){
        bx = x;
        by = y;
        bw = w;
        bh = h - (borders[2].width);

        switch(borderSide){
          case 0:
            // top border
            bh = borders[0].width;

            i = 0;
            borderArgs[ i++ ] = [ "line", bx, by ];  // top left
            borderArgs[ i++ ] = [ "line", bx + bw, by ]; // top right
            borderArgs[ i++ ] = [ "line", bx + bw - borders[ 1 ].width, by + bh  ]; // bottom right
            borderArgs[ i++ ] = [ "line", bx + borders[ 3 ].width, by + bh ]; // bottom left

            break;
          case 1:
            // right border
            bx = x + w - (borders[1].width);
            bw = borders[1].width;

            i = 0;
            borderArgs[ i++ ] = [ "line", bx, by + borders[ 0 ].width];  // top left
            borderArgs[ i++ ] = [ "line", bx + bw, by ]; // top right
            borderArgs[ i++ ] = [ "line", bx + bw, by + bh + borders[ 2 ].width ]; // bottom right
            borderArgs[ i++ ] = [ "line", bx, by + bh ]; // bottom left

            break;
          case 2:
            // bottom border
            by = (by + h) - (borders[2].width);
            bh = borders[2].width;

            i = 0;
            borderArgs[ i++ ] = [ "line", bx + borders[ 3 ].width, by ];  // top left
            borderArgs[ i++ ] = [ "line", bx + bw - borders[ 2 ].width, by ]; // top right
            borderArgs[ i++ ] = [ "line", bx + bw, by + bh ]; // bottom right
            borderArgs[ i++ ] = [ "line", bx, by + bh ]; // bottom left

            break;
          case 3:
            // left border
            bw = borders[3].width;

            i = 0;
            borderArgs[ i++ ] = [ "line", bx, by ];  // top left
            borderArgs[ i++ ] = [ "line", bx + bw, by + borders[ 0 ].width ]; // top right
            borderArgs[ i++ ] = [ "line", bx + bw, by + bh ]; // bottom right
            borderArgs[ i++ ] = [ "line", bx, by + bh + borders[ 2 ].width ]; // bottom left

            break;
        }

        borderBounds = {
          left:bx,
          top:by,
          width: bw,
          height:bh
        };

        if (clip){
          borderBounds = clipBounds(borderBounds, clip);
        }


        if ( borderBounds.width > 0 && borderBounds.height > 0 ) {

          if ( borderData.color !== "transparent" ){
            ctx.setVariable( "fillStyle", borderData.color );

            var shape = ctx.drawShape(),
            numBorderArgs = borderArgs.length;

            for ( i = 0; i < numBorderArgs; i++ ) {
              shape[( i === 0) ? "moveTo" : borderArgs[ i ][ 0 ] + "To" ].apply( null, borderArgs[ i ].slice(1) );
            }

            numDraws+=1;
          }

        }


      }
    }

    return borders;
  }


  function renderFormValue (el, bounds, stack){

    var valueWrap = doc.createElement('valuewrap'),
    cssPropertyArray = ['lineHeight','textAlign','fontFamily','color','fontSize','paddingLeft','paddingTop','width','height','border','borderLeftWidth','borderTopWidth'],
    textValue,
    textNode;

    cssPropertyArray.forEach(function(property) {
      try {
        valueWrap.style[property] = getCSS(el, property);
      } catch(e) {
        // Older IE has issues with "border"
        h2clog("html2canvas: Parse: Exception caught in renderFormValue: " + e.message);
      }
    });

    valueWrap.style.borderColor = "black";
    valueWrap.style.borderStyle = "solid";
    valueWrap.style.display = "block";
    valueWrap.style.position = "absolute";

    if (/^(submit|reset|button|text|password)$/.test(el.type) || el.nodeName === "SELECT"){
      valueWrap.style.lineHeight = getCSS(el, "height");
    }

    valueWrap.style.top = bounds.top + "px";
    valueWrap.style.left = bounds.left + "px";

    textValue = (el.nodeName === "SELECT") ? (el.options[el.selectedIndex] || 0).text : el.value;
    if(!textValue) {
      textValue = el.placeholder;
    }

    textNode = doc.createTextNode(textValue);

    valueWrap.appendChild(textNode);
    body.appendChild(valueWrap);

    renderText(el, textNode, stack);
    body.removeChild(valueWrap);
  }

  function drawImage (ctx) {
    ctx.drawImage.apply(ctx, Array.prototype.slice.call(arguments, 1));
    numDraws+=1;
  }

  function renderBackgroundSlice (ctx, image, x, y, width, height, elx, ely){
    var sourceX = (elx - x > 0) ? elx-x :0,
    sourceY= (ely - y > 0) ? ely-y : 0;

    drawImage(
      ctx,
      image,
      Math.floor(sourceX), // source X
      Math.floor(sourceY), // source Y
      Math.ceil(image.width-sourceX), // source Width
      Math.ceil(image.height-sourceY), // source Height
      Math.ceil(x+sourceX), // destination X
      Math.ceil(y+sourceY), // destination Y
      Math.ceil(width-sourceX), // destination width
      Math.ceil(height-sourceY) // destination height
      );
  }

  function renderBackgroundRepeat(ctx, image, backgroundPosition, bounds) {
    var bgy,
    height,
    add,
    h;

    backgroundPosition.top -= Math.ceil(backgroundPosition.top / image.height) * image.height;

    for(bgy = (bounds.top + backgroundPosition.top); bgy < (bounds.height + bounds.top); bgy = Math.floor(bgy+image.height) - add) {
      h = Math.min(image.height,(bounds.height + bounds.top) - bgy);

      height = (Math.floor(bgy + image.height) > h + bgy) ? (h + bgy) - bgy : image.height;

      if (bgy < bounds.top){
        add = bounds.top - bgy;
        bgy = bounds.top;
      } else {
        add = 0;
      }

      renderBackgroundRepeatX(ctx, image, backgroundPosition, bounds.left, bgy, bounds.width, height);

      if (add > 0){
        backgroundPosition.top += add;
      }
    }
  }

  function renderBackgroundNoRepeat(ctx, image, backgroundPosition, x, y, w, h) {
    var bgdw = w - backgroundPosition.left,
    bgdh = h - backgroundPosition.top,
    bgsx = backgroundPosition.left,
    bgsy = backgroundPosition.top,
    bgdx = backgroundPosition.left + x,
    bgdy = backgroundPosition.top + y;

    if (bgsx<0){
      bgsx = Math.abs( bgsx );
      bgdx += bgsx;
      bgdw = Math.min( w, image.width - bgsx );
    } else {
      bgdw = Math.min( bgdw, image.width );
      bgsx = 0;
    }

    if (bgsy < 0){
      bgsy = Math.abs( bgsy );
      bgdy += bgsy;
      bgdh = Math.min( h, image.height - bgsy );
    } else {
      bgdh = Math.min( bgdh, image.height );
      bgsy = 0;
    }

    if (bgdh > 0 && bgdw > 0){
      drawImage(
        ctx,
        image,
        bgsx,
        bgsy,
        image.width,
        image.height,
        bgdx,
        bgdy,
        bgdw + backgroundPosition.left,
        bgdh + backgroundPosition.top
        );
    }
  }

  function renderBackgroundRepeatY (ctx, image, backgroundPosition, x, y, w, h){
    var height,
    width = Math.min(image.width, w),
    bgy;

    backgroundPosition.top -= Math.ceil(backgroundPosition.top / image.height) * image.height;

    for (bgy = y + backgroundPosition.top; bgy < h + y; bgy = Math.round(bgy + image.height)){
      height = (Math.floor(bgy + image.height) > h + y) ? (h+y) - bgy : image.height;
      renderBackgroundSlice(ctx, image, x + backgroundPosition.left, bgy,width, height, x, y);
    }
  }

  function renderBackgroundRepeatX(ctx, image, backgroundPosition, x, y, w, h){
    var height = Math.min(image.height, h),
    width,
    bgx;

    backgroundPosition.left -= Math.ceil(backgroundPosition.left / image.width) * image.width;

    for (bgx = x + backgroundPosition.left; bgx < w + x; bgx = Math.round(bgx + image.width)) {
      width = (Math.floor(bgx + image.width) > w + x) ? (w + x) - bgx : image.width;
      renderBackgroundSlice(ctx, image, bgx,(y + backgroundPosition.top), width, height, x, y);
    }
  }

  function renderBackgroundColor(ctx, backgroundBounds, bgcolor) {
    renderRect(
      ctx,
      backgroundBounds.left,
      backgroundBounds.top,
      backgroundBounds.width,
      backgroundBounds.height,
      bgcolor
      );
  }

  function renderBackgroundRepeating(el, bounds, ctx, image, imageIndex) {
    var backgroundSize = _html2canvas.Util.BackgroundSize(el, bounds, image, imageIndex),
    backgroundPosition = _html2canvas.Util.BackgroundPosition(el, bounds, image, imageIndex, backgroundSize),
    backgroundRepeat = getCSS(el, "backgroundRepeat").split(",");

    backgroundRepeat = backgroundRepeat[imageIndex] || backgroundRepeat[0];

    switch (backgroundRepeat) {
      case "repeat-x":
        renderBackgroundRepeatX(ctx, image, backgroundPosition, bounds.left, bounds.top, backgroundSize.width, backgroundSize.height);
        break;

      case "repeat-y":
        renderBackgroundRepeatY(ctx, image, backgroundPosition, bounds.left, bounds.top, backgroundSize.width, backgroundSize.height);
        break;

      case "no-repeat":
        renderBackgroundNoRepeat(ctx, image, backgroundPosition, bounds.left, bounds.top, backgroundSize.width, backgroundSize.height);
        break;

      default:
        renderBackgroundRepeat(ctx, image, backgroundPosition, { top: bounds.top, left: bounds.left, width: backgroundSize.width, height: backgroundSize.height });
        break;
    }
  }

  function renderBackgroundImage(element, bounds, ctx) {
    var backgroundImage = getCSS(element, "backgroundImage"),
    backgroundImages = _html2canvas.Util.parseBackgroundImage(backgroundImage),
    image;

    for(var imageIndex = backgroundImages.length; imageIndex-- > 0;) {
      backgroundImage = backgroundImages[imageIndex];
     
      if (!backgroundImage.args || backgroundImage.args.length === 0) {
        continue;
      }

      var key = backgroundImage.method === 'url' ?
        backgroundImage.args[0] :
        backgroundImage.value + '/' + element.__html2canvas__id + '/' + imageIndex;

      image = loadImage(key);

      // TODO add support for background-origin
      if (image) {
        renderBackgroundRepeating(element, bounds, ctx, image, imageIndex);
      } else {
        h2clog("html2canvas: Error loading background:" + backgroundImage);
      }
    }
  }

  function setOpacity(ctx, element, parentStack) {
    var opacity = getCSS(element, "opacity") * ((parentStack) ? parentStack.opacity : 1);
    ctx.setVariable("globalAlpha", opacity);
    return opacity;
  }

  function createStack(element, parentStack, bounds) {

    var ctx = h2cRenderContext((!parentStack) ? documentWidth() : bounds.width , (!parentStack) ? documentHeight() : bounds.height),
    stack = {
      ctx: ctx,
      zIndex: setZ(getCSS(element, "zIndex"), (parentStack) ? parentStack.zIndex : null),
      opacity: setOpacity(ctx, element, parentStack),
      cssPosition: getCSS(element, "position"),
      borders: renderBorders(element, ctx, bounds, false),
      clip: (parentStack && parentStack.clip) ? _html2canvas.Util.Extend( {}, parentStack.clip ) : null
    };

    // TODO correct overflow for absolute content residing under a static position
    if (options.useOverflow === true && /(hidden|scroll|auto)/.test(getCSS(element, "overflow")) === true && /(BODY)/i.test(element.nodeName) === false){
      stack.clip = (stack.clip) ? clipBounds(stack.clip, bounds) : bounds;
    }

    stack.zIndex.children.push(stack);

    return stack;
  }

  function getBackgroundBounds(borders, bounds, clip) {
    var backgroundBounds = {
      left: bounds.left + borders[3].width,
      top: bounds.top + borders[0].width,
      width: bounds.width - (borders[1].width + borders[3].width),
      height: bounds.height - (borders[0].width + borders[2].width)
    };

    if (clip) {
      backgroundBounds = clipBounds(backgroundBounds, clip);
    }

    return backgroundBounds;
  }

  function renderElement(element, parentStack){
    var bounds = _html2canvas.Util.Bounds(element),
    image,
    bgcolor = (ignoreElementsRegExp.test(element.nodeName)) ? "#efefef" : getCSS(element, "backgroundColor"),
    stack = createStack(element, parentStack, bounds),
    borders = stack.borders,
    ctx = stack.ctx,
    backgroundBounds = getBackgroundBounds(borders, bounds, stack.clip);

    if (backgroundBounds.height > 0 && backgroundBounds.width > 0){
      renderBackgroundColor(ctx, backgroundBounds, bgcolor);
      renderBackgroundImage(element, backgroundBounds, ctx);
    }

    switch(element.nodeName){
      case "IMG":
        if ((image = loadImage(element.getAttribute('src')))) {
          renderImage(ctx, element, image, bounds, borders);
        } else {
          h2clog("html2canvas: Error loading <img>:" + element.getAttribute('src'));
        }
        break;
      case "INPUT":
        // TODO add all relevant type's, i.e. HTML5 new stuff
        // todo add support for placeholder attribute for browsers which support it
        if (/^(text|url|email|submit|button|reset)$/.test(element.type) && (element.value || element.placeholder).length > 0){
          renderFormValue(element, bounds, stack);
        }
        break;
      case "TEXTAREA":
        if ((element.value || element.placeholder).length > 0){
          renderFormValue(element, bounds, stack);
        }
        break;
      case "SELECT":
        if ((element.options||element.placeholder).length > 0){
          renderFormValue(element, bounds, stack);
        }
        break;
      case "LI":
        renderListItem(element, stack, backgroundBounds);
        break;
      case "CANVAS":
        renderImage(ctx, element, element, bounds, borders);
        break;
    }

    return stack;
  }

  function isElementVisible(element) {
    return (getCSS(element, 'display') !== "none" && getCSS(element, 'visibility') !== "hidden" && !element.hasAttribute("data-html2canvas-ignore"));
  }

  function parseElement (el, stack) {

    if (isElementVisible(el)) {
      stack = renderElement(el, stack) || stack;
      if (!ignoreElementsRegExp.test(el.nodeName)) {
        _html2canvas.Util.Children(el).forEach(function(node) {
          if (node.nodeType === 1) {
            parseElement(node, stack);
          } else if (node.nodeType === 3) {
            renderText(el, node, stack);
          }
        });
      }
    }
  }

  function svgDOMRender(body, stack) {
    var img = new Image(),
    docWidth = documentWidth(),
    docHeight = documentHeight(),
    html = "";

    function parseDOM(el) {
      var children = _html2canvas.Util.Children( el ),
      len = children.length,
      attr,
      a,
      alen,
      elm,
      i;
      for ( i = 0; i < len; i+=1 ) {
        elm = children[ i ];
        if ( elm.nodeType === 3 ) {
          // Text node
          html += elm.nodeValue.replace(/</g,"&lt;").replace(/>/g,"&gt;");
        } else if ( elm.nodeType === 1 ) {
          // Element
          if ( !/^(script|meta|title)$/.test(elm.nodeName.toLowerCase()) ) {

            html += "<" + elm.nodeName.toLowerCase();

            // add attributes
            if ( elm.hasAttributes() ) {
              attr = elm.attributes;
              alen = attr.length;
              for ( a = 0; a < alen; a+=1 ) {
                html += " " + attr[ a ].name + '="' + attr[ a ].value + '"';
              }
            }


            html += '>';

            parseDOM( elm );


            html += "</" + elm.nodeName.toLowerCase() + ">";
          }
        }

      }

    }

    parseDOM(body);
    img.src = [
    "data:image/svg+xml,",
    "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' width='" + docWidth + "' height='" + docHeight + "'>",
    "<foreignObject width='" + docWidth + "' height='" + docHeight + "'>",
    "<html xmlns='http://www.w3.org/1999/xhtml' style='margin:0;'>",
    html.replace(/\#/g,"%23"),
    "</html>",
    "</foreignObject>",
    "</svg>"
    ].join("");

    img.onload = function() {
      stack.svgRender = img;
    };

  }

  function init() {
    var stack = renderElement(element, null);

    if (support.svgRendering) {
      svgDOMRender(document.documentElement, stack);
    }

    Array.prototype.slice.call(element.children, 0).forEach(function(childElement) {
      parseElement(childElement, stack);
    });

    stack.backgroundColor = getCSS(document.documentElement, "backgroundColor");

    return stack;
  }

  return init();
};

function h2czContext(zindex) {
  return {
    zindex: zindex,
    children: []
  };
}
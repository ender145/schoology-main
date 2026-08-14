/**
 * 7/13/16 - Camden
 * for SGY-24684 I've modified the calendar's _showDatepicker method to use $.width() instead of el.offsetWidth
 * $.width is a safer method of accessing the width value from the element, which takes into consideration offsetWidth, scrollWidth, clientWidth and CSS assigned values.
 */


(function($){
  var currentYearHijri = 0;
  /** Hijri Date code for date picker starts */
  var hijri_visibility = false;
  var is_first_launch = true;

  /** getHijriVisibility method is used to get the visibility of the hijri date */
  function getHijriVisibility() {
    return hijri_visibility ? '' : 'display:none';
  }
  /** getHijriBaseUrl method responsible for fetching Hijri base url of CDN */
  function getHijriBaseUrl(settings) {
    return settings?.datepicker?.hijri?.url + '/';
  }
  /** isHijriEnabled method that checks presence of Hijri calendar settings. */
  function isHijriEnabled(settings) {
    return !!settings?.datepicker?.hijri;
  }

  function getDisplayedYear(year, currentYear, range) {
    if (!currentYearHijri) {
      currentYearHijri = year;
    }
    let displayedYear = year
    const minYear = (currentYear || currentYearHijri) + parseInt(range.split(':')[0]);
    const maxYear = (currentYear || currentYearHijri) + parseInt(range.split(':')[1]);
    if (displayedYear < minYear) {
      displayedYear = maxYear;
    } else if (displayedYear > maxYear) {
      displayedYear = minYear;
    }
    return displayedYear;

  }

  /**
   * appendDateMapping method is used to append the hijri date mapping to the date picker
   * @param {string} selectedYear
   * @param {string} selectedMonth
   * @param {string} range
   * @param {string} currentYear
   * @param {object} settings
   */
  async function appendDateMapping(selectedYear, selectedMonth, range, currentYear,  settings) {
    try{
      if (!isHijriEnabled(settings) || settings?.datepicker?.hijri?.months?.length < 12 || !range) {
        return;
      }
      const spiltedRange = range.split(':');
      if (spiltedRange.length !== 2) {
        return;
      }

      let displayedYear = getDisplayedYear(selectedYear, currentYear, range);
      const firstDate = new Date(displayedYear, selectedMonth, 1);
      const lastDate = new Date(displayedYear, selectedMonth + 1, 0);
      const startDate = formatDateHijri(firstDate);
      const endDate = formatDateHijri(lastDate)
      const mapping = await getDateMapping(startDate, endDate, getHijriBaseUrl(settings))
      const firstDateHijri = mapping[startDate];
      const lastDateHijri = mapping[endDate];
      const startMonth = retrieveDate(firstDateHijri, 'month');
      const endMonth = retrieveDate(lastDateHijri, 'month');
      const startYear = retrieveDate(firstDateHijri, 'year');
      const endYear = retrieveDate(lastDateHijri, 'year');
      const startMonthName =  settings.datepicker.hijri.months[Number(startMonth) -1];
      const endMonthName =  settings.datepicker.hijri.months[Number(endMonth) -1];
      let view = startMonthName + ' ';
      view += startYear === endYear ? '' : startYear;
      view += ' - ' + endMonthName + ' ' + endYear;
      $('.month-text_dp').text(view);
      for (const [key, value] of Object.entries(mapping)) {
        $('.month_label_hijri_dp_' + key).text(retrieveDate(value, 'day'));
      }
    }
    catch(e){
      return;
    }
  }

  function showHijriDates() {
    hijri_visibility = true;
    setTimeout(() => {
      $('.container-hijri-dp, .month_label_text_dp').show();
      $('.month-text_dp').css("visibility", "visible");
      $('.check_dp').show();
    }, 220);
  }

  function hideHijriDates() {
    hijri_visibility = false;

    $('.container-hijri-dp, .month_label_text_dp').hide();
    $('.month-text_dp').css("visibility", "hidden");
    $('.check_dp').hide();
  }

  function setIntialHijriView() {
    if (!is_first_launch)
      return;
    hijri_visibility = getUserHijriDatePreference(window.Drupal.settings);
    is_first_launch = false;
  }

  function getUserHijriDatePreference(settings) {
    return settings?.datepicker?.hijri?.enableHijriDates;
  }

  /** hijri_toggle method contains the ui for the hijri date picker */
  async function hijriToggle(settings){
    try{
      if (!isHijriEnabled(settings) && !settings.datepicker.hijri.heading) {
        return;
      }
      setIntialHijriView();
      const isChecked = getHijriVisibility() === '' ? 'checked' : '';
      const hijriMonthContent = `<div class="month-text_dp" id="month_label_text_dp" style="${isChecked ? '': 'visibility:hidden'}"></div>`;
      const hijriToggleWithHeading = `<div class="toggle_area_dp"><div class="align-item-center"><label id="toggle_dp" class="switch_dp"><input aria-label="${settings.datepicker.hijri.heading}" tabindex="0" id="toggle_hij_dp" class="toggle_hijri" type="checkbox" ${isChecked}><div class="slider round"><span class="check_dp" style="${getHijriVisibility()}"></span></div></label></div><div class="hijri-date-heading">${settings.datepicker.hijri.heading}</div></div>`;
      $('.hijri-container').remove();
      $('.hijri_date_picker_container').prepend(`<div class="hijri-container">${hijriMonthContent}${hijriToggleWithHeading}</div>`);
      let lastFocussedElementId = null
        $(document).on('focusout', function(e) {
            lastFocussedElementId = `#${e.target.id}`;
        });
      $('.toggle_hijri').change(function () {
        if (lastFocussedElementId) {
            $(lastFocussedElementId).focus(); // hack to fix the due date field focus issue
        }
        $(".toggle_hijri").prop('disabled', true);
        if ($(this).prop('checked')) {
          showHijriDates();
        } else {
          hideHijriDates();
        }
        setTimeout(() => {
          $(".toggle_hijri").prop('disabled', false);
        }, 500);
      });
    }
    catch (e){
      return;
    }
  }

  //Accessibilty related changes

  // Utility function to get focusable elements within the modal
  function getFocusableElements(modal) {
    const allFocusable = modal.querySelectorAll(
      '.ui-datepicker-prev-a, .ui-datepicker-new-month, .ui-datepicker-new-year, .ui-datepicker-next-a, .ui-datepicker-clear-a, .ui-datepicker-close-a, tbody, #toggle_hij_dp'
    );
    
    // Filter out hidden elements
    return Array.from(allFocusable).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
  }

  // Utility function to get the currently highlighted focusable element
  function getCurrentFocusableElement(modal, focusableElements) {
    return focusableElements[
      Array.prototype.indexOf.call(
        focusableElements,
        modal.querySelector('.ui-datepicker-accessibility-cell-highlight')
      )
    ];
  }

  // Utility function to highlight an element
  function highlightElement(element) {
    element.classList.add('ui-datepicker-accessibility-cell-highlight');
    element.focus();
  }

  // Utility function to remove highlight from an element
  function removeHighlight(element) {
    element.classList.remove('ui-datepicker-accessibility-cell-highlight');
    element.blur();
  }

  // Utility function to set the accessibility focus class
  function setAccessibilityFocusClass(inst, element) {
    const classList = element.className.split(' ');
    const matchingClass = classList.find(className => {
      return Array.prototype.some.call(
        getFocusableElements(
          document.querySelector('#ui-datepicker-div')
        ),
        el => el.classList.contains(className)
      );
    });
    if (matchingClass) {
      inst.settings.currentAccessibilityFocusClass = matchingClass;
    }
  }

  // Function to highlight the accessibility focus
  function highlightAccessibilityFocus(inst, isBackward = false) {
    const modal = document.querySelector('#ui-datepicker-div');
    const focusableElements = getFocusableElements(modal);
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    const highlightedElement = modal.querySelector('.ui-datepicker-accessibility-cell-highlight');

    if (highlightedElement) {
      const currentFocusableElement = getCurrentFocusableElement(modal, focusableElements);
      removeHighlight(currentFocusableElement);
      let nextFocusableElement;
      if (isBackward) {
        nextFocusableElement = focusableElements[Array.prototype.indexOf.call(focusableElements, currentFocusableElement) - 1] || lastFocusableElement;
      } else {
        nextFocusableElement = focusableElements[Array.prototype.indexOf.call(focusableElements, currentFocusableElement) + 1] || firstFocusableElement;
      }

      setAccessibilityFocusClass(inst, nextFocusableElement);
      if (nextFocusableElement.classList.contains('ui-datepicker-tbody')) {
        nextFocusableElement.classList.add('ui-datepicker-accessibility-cell-highlight');
        highlightAccessibilityFocusedCell(inst);
      } else {
        highlightElement(nextFocusableElement);
      }
    } else {
      const currentAccessibilityFocusClass = inst.settings.currentAccessibilityFocusClass;
      const currentFocusableElement = currentAccessibilityFocusClass ? modal.querySelector(`.${currentAccessibilityFocusClass}`) : firstFocusableElement;
      setAccessibilityFocusClass(inst, currentFocusableElement);
      highlightElement(currentFocusableElement);
    }
  }

  // Function to handle custom accessibility space functionality
  function customAccessibilitySpaceFunctionality() {
    const modal = document.querySelector('#ui-datepicker-div');
    if (modal.querySelector('.ui-datepicker-accessibility-cell-highlight')) {
      const focusableElements = getFocusableElements(modal);
      const currentFocusableElement = getCurrentFocusableElement(modal, focusableElements);
      $(currentFocusableElement).trigger('click');
    }
  }

  // Function to highlight the currently focused cell
  function highlightAccessibilityFocusedCell(inst) {
    $('#ui-datepicker-div td').removeClass('ui-datepicker-current-day');
    var selectedDate = inst.selectedDay;
    var selectedMonth = inst.selectedMonth;
    var selectedYear = inst.selectedYear;
    var monthNames = $.datepicker._defaults.monthNames;
    var $selectedCell = $('.ui-datepicker-days-cell-over');
    var cellindex = $selectedCell.index();
    var dayNames = $.datepicker._defaults.dayNames;

    $('#ui-datepicker-div .ui-datepicker-days-cell a').each(function() {
      if ($(this).text() == selectedDate) {
        $(this).parent().addClass('ui-datepicker-current-day');
        var ariaLabel = dayNames[cellindex] + ', ' + monthNames[selectedMonth] + ' ' + selectedDate + ', ' + selectedYear;
        $(this).attr('aria-label', ariaLabel);
        $(this).focus();
      }
    });
  }

  // Function to trap focus inside the datepicker
  function trapFocusInsideDatepicker() {
    const modal = document.querySelector('#ui-datepicker-div');
    if (modal.hasEventListener) {
      return;
    }

    modal.addEventListener('keydown', trapFocusKeydownHandler);
  }

  // Named function for the keydown event listener
  function trapFocusKeydownHandler(e) {
    const modal = document.querySelector('#ui-datepicker-div');
    if ($.datepicker._datepickerShowing === false) {
      return;
    }
    modal.hasEventListener = true;
    var instance = $.datepicker._curInst;
    instance.settings.outOfTrapFocusFunction = false;
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          highlightAccessibilityFocus(instance, true);
        } else {
          highlightAccessibilityFocus(instance, false);
        }
        break;
      case 'Enter':
        handleEnterKey(instance, modal, e);
        break;
      case ' ':
        handleSpaceKey(instance, e);
        break;
      case 'ArrowLeft':
        handleArrowKey(instance, e, -1, 'D');
        break;
      case 'ArrowUp':
        handleArrowKey(instance, e, -7, 'D');
        break;
      case 'ArrowRight':
        handleArrowKey(instance, e, +1, 'D');
        break;
      case 'ArrowDown':
        handleArrowKey(instance, e, +7, 'D');
        break;
      case 'PageUp':
        handlePageKey(instance, e, +1, 'M', +1, 'Y');
        break;
      case 'PageDown':
        handlePageKey(instance, e, -1, 'M', -1, 'Y');
        break;
      case 'Escape':
        handleEscapeKey(instance, modal, e);
        break;
      default:
        break;
    }
  }

  // Function to handle the enter key
  function handleEnterKey(instance, modal, e) {
    if (document.activeElement.classList.contains('ui-datepicker-prev-a')) {
      e.preventDefault();
      $.datepicker._adjustDate(instance.input, -1, 'M');
    } else if (document.activeElement.classList.contains('ui-datepicker-next-a')) {
      e.preventDefault();
      $.datepicker._adjustDate(instance.input, 1, 'M');
    } else if (document.activeElement.classList.contains('ui-datepicker-cell-a')) {
      $.datepicker._selectDay(
        instance.input[0],
        instance.selectedMonth,
        instance.selectedYear,
        $('td.ui-datepicker-days-cell-over', instance.dpDiv)[0]
      );
      resetDatepickerState(instance, modal, e);
    } else if (document.activeElement.classList.contains('ui-datepicker-clear-a')) {
      e.preventDefault();
      $.datepicker._clearDate(instance.input);
    } else if (document.activeElement.classList.contains('ui-datepicker-close-a')) {
      e.preventDefault();
      $.datepicker._hideDatepicker();
    } else if (document.activeElement.classList.contains('toggle_hijri')) {
      customAccessibilitySpaceFunctionality();
      e.preventDefault();
    } else {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Function to handle the escape key
  function handleEscapeKey(instance, modal, e) {
    $.datepicker._hideDatepicker(
      null,
      $.datepicker._get(instance, 'duration')
    );
    resetDatepickerState(instance, modal, e);
  }

  // Function to reset the datepicker state
  function resetDatepickerState(instance, modal, e) {
    e.preventDefault();
    e.stopPropagation();
    instance.settings.currentAccessibilityFocusClass = '';
    instance.settings.outOfTrapFocusFunction = true;
    modal.removeEventListener('keydown', trapFocusKeydownHandler);
    modal.hasEventListener = false;
    instance.input[0].focus();
  }

  // Function to handle the space key
  function handleSpaceKey(instance, e) {
    if (document.activeElement.classList.contains('ui-datepicker-prev-a')) {
      e.preventDefault();
      $.datepicker._adjustDate(instance.input, -1, 'M');
    } else if (document.activeElement.classList.contains('ui-datepicker-next-a')) {
      e.preventDefault();
      $.datepicker._adjustDate(instance.input, 1, 'M');
    } else if (document.activeElement.classList.contains('ui-datepicker-new-month') || document.activeElement.classList.contains('ui-datepicker-new-year')) {
      customAccessibilitySpaceFunctionality();
    } else if (document.activeElement.classList.contains('ui-datepicker-clear-a')) {
      e.preventDefault();
      $.datepicker._clearDate(instance.input);
    } else if (document.activeElement.classList.contains('ui-datepicker-close-a')) {
      e.preventDefault();
      $.datepicker._hideDatepicker();
    } else if (document.activeElement.classList.contains('toggle_hijri')) {
      customAccessibilitySpaceFunctionality();
      e.preventDefault();
    } else {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Function to handle arrow keys
  function handleArrowKey(instance, e, offset, period) {
    e.preventDefault();
    if (document.activeElement.classList.contains('ui-datepicker-cell-a')) {
      $.datepicker._adjustDate(instance.input, offset, period);
      highlightAccessibilityFocusedCell(instance);
    }
  }

  // Function to handle page keys
  function handlePageKey(instance, e, monthOffset, monthPeriod, yearOffset, yearPeriod) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      $.datepicker._adjustDate(instance.input, yearOffset, yearPeriod);
    } else {
      $.datepicker._adjustDate(instance.input, monthOffset, monthPeriod);
    }
  }

  var PROP_NAME='datepicker';
  function Datepicker(){
    this.debug=false;
    this._curInst=null;
    this._disabledInputs=[];
    this._datepickerShowing=false;
    this._inDialog=false;
    this._mainDivId='ui-datepicker-div';
    this._mainDivClass='ui-datepicker-div-hijri';
    this._inlineClass='ui-datepicker-inline';
    this._appendClass='ui-datepicker-append';
    this._triggerClass='ui-datepicker-trigger';
    this._dialogClass='ui-datepicker-dialog';
    this._promptClass='ui-datepicker-prompt';
    this._disableClass='ui-datepicker-disabled';
    this._unselectableClass='ui-datepicker-unselectable';
    this._currentClass='ui-datepicker-current-day';
    this.regional=[];
    this.regional['']={
      clearText:'Clear',
      clearStatus:'Erase the current date',
      closeText:'Close',
      closeStatus:'Close without change',
      prevText:'&#x3c;Prev',
      prevStatus:'Show the previous month',
      prevBigText:'&#x3c;&#x3c;',
      prevBigStatus:'Show the previous year',
      nextText:'Next&#x3e;',
      nextStatus:'Show the next month',
      nextBigText:'&#x3e;&#x3e;',
      nextBigStatus:'Show the next year',
      currentText:'Today',
      currentStatus:'Show the current month',
      monthNames:['January','February','March','April','May','June','July','August','September','October','November','December'],
      monthNamesShort:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      monthStatus:'Show a different month',
      yearStatus:'Show a different year',
      weekHeader:'Wk',
      weekStatus:'Week of the year',
      dayNames:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      dayNamesShort:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      dayNamesMin:['Su','Mo','Tu','We','Th','Fr','Sa'],
      dayStatus:'Set DD as first week day',
      dateStatus:'Select DD, M d',
      dateFormat:'mm/dd/yy',
      firstDay:0,
      initStatus:'Select a date',
      isRTL:false,
      currentAccessibilityFocusClass:'',
      outOfTrapFocusFunction: false
    };
    this._defaults={
      showOn:'focus',
      showAnim:'show',
      showOptions:{},
      defaultDate:null,
      appendText:'',
      buttonText:'...',
      buttonImage:'',
      buttonImageOnly:false,
      closeAtTop:true,
      mandatory:false,
      hideIfNoPrevNext:false,
      navigationAsDateFormat:false,
      showBigPrevNext:false,
      gotoCurrent:false,
      changeMonth:true,
      changeYear:true,
      showMonthAfterYear:false,
      yearRange:'-10:+10',
      changeFirstDay:true,
      highlightWeek:false,
      showOtherMonths:false,
      showWeeks:false,
      calculateWeek:this.iso8601Week,
      shortYearCutoff:'+10',
      showStatus:false,
      statusForDate:this.dateStatus,
      minDate:null,
      maxDate:null,
      duration:'normal',
      beforeShowDay:null,
      beforeShow:null,
      onSelect:null,
      onChangeMonthYear:null,
      onClose:null,
      numberOfMonths:1,
      showCurrentAtPos:0,
      stepMonths:1,
      stepBigMonths:12,
      rangeSelect:false,
      rangeSeparator:' - ',
      altField:'',
      altFormat:''
    };
    $.extend(
      this._defaults,
      this.regional['']
    );
    this.dpDiv=$('<div id="'+this._mainDivId+'" style="display: none;" class="hijri_date_picker_container" role="dialog" aria-modal="true"></div>');
  }
$.extend(Datepicker.prototype,{markerClassName:'hasDatepicker',log:function(){if(this.debug)
console.log.apply('',arguments);},setDefaults:function(settings){extendRemove(this._defaults,settings||{});return this;},_attachDatepicker:function(target,settings){var inlineSettings=null;for(attrName in this._defaults){var attrValue=target.getAttribute('date:'+attrName);if(attrValue){inlineSettings=inlineSettings||{};try{inlineSettings[attrName]=eval(attrValue);}catch(err){inlineSettings[attrName]=attrValue;}}}
var nodeName=target.nodeName.toLowerCase();var inline=(nodeName=='div'||nodeName=='span');if(!target.id)
target.id='dp'+(++this.uuid);var inst=this._newInst($(target),inline);inst.settings=$.extend({},settings||{},inlineSettings||{});if(nodeName=='input'){this._connectDatepicker(target,inst);}else if(inline){this._inlineDatepicker(target,inst);}},_newInst:function(target,inline){var id=target[0].id.replace(/([:\[\]\.])/g,'\\\\$1');return{id:id,input:target,selectedDay:0,selectedMonth:0,selectedYear:0,drawMonth:0,drawYear:0,inline:inline,dpDiv:(!inline?this.dpDiv:$('<div class="'+this._inlineClass+'"></div>'))};},_connectDatepicker:function(target,inst){var input=$(target);if(input.hasClass(this.markerClassName))
return;var appendText=this._get(inst,'appendText');var isRTL=this._get(inst,'isRTL');

    if(appendText)input[isRTL ? "before" : "after"]($("<span>").addClass(this._appendClass).text(appendText));

var showOn=this._get(inst,'showOn');if(showOn=='focus'||showOn=='both')
input.focus(this._showDatepicker);if(showOn=='button'||showOn=='both'){var buttonText=this._get(inst,'buttonText');var buttonImage=this._get(inst,'buttonImage');

    if (this._get(inst, "buttonImageOnly")){
      var trigger=$("<img/>")
        .addClass(this._triggerClass)
        .attr({src:buttonImage,alt:buttonText,title:buttonText });
    }else{
      var trigger=$('<button type="button"></button>')
        .addClass(this._triggerClass);
      if(buttonImage){
        trigger.html($("<img/>")
          .attr({src:buttonImage,alt:buttonText,title:buttonText}));
      }else{
        trigger.text(buttonText);
      }
    }
    input[isRTL?'before':'after'](trigger);

  trigger.click(function(){if($.datepicker._datepickerShowing&&$.datepicker._lastInput==target)
$.datepicker._hideDatepicker();else
$.datepicker._showDatepicker(target);return false;});}
input.addClass(this.markerClassName).keydown(this._doKeyDown).keypress(this._doKeyPress).bind("setData.datepicker",function(event,key,value){inst.settings[key]=value;}).bind("getData.datepicker",function(event,key){return this._get(inst,key);});$.data(target,PROP_NAME,inst);},_inlineDatepicker:function(target,inst){var divSpan=$(target);if(divSpan.hasClass(this.markerClassName))
return;divSpan.addClass(this.markerClassName).append(inst.dpDiv).bind("setData.datepicker",function(event,key,value){inst.settings[key]=value;}).bind("getData.datepicker",function(event,key){return this._get(inst,key);});$.data(target,PROP_NAME,inst);this._setDate(inst,this._getDefaultDate(inst));this._updateDatepicker(inst);},_inlineShow:function(inst){var numMonths=this._getNumberOfMonths(inst);inst.dpDiv.width(numMonths[1]*$('.ui-datepicker',inst.dpDiv[0]).width());},_dialogDatepicker:function(input,dateText,onSelect,settings,pos){var inst=this._dialogInst;if(!inst){var id='dp'+(++this.uuid);this._dialogInput=$('<input type="text" id="'+id+'" size="1" style="position: absolute; top: -100px;"/>');this._dialogInput.keydown(this._doKeyDown);$('body').append(this._dialogInput);inst=this._dialogInst=this._newInst(this._dialogInput,false);inst.settings={};$.data(this._dialogInput[0],PROP_NAME,inst);}
extendRemove(inst.settings,settings||{});this._dialogInput.val(dateText);this._pos=(pos?(pos.length?pos:[pos.pageX,pos.pageY]):null);if(!this._pos){var browserWidth=window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth;var browserHeight=window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight;var scrollX=document.documentElement.scrollLeft||document.body.scrollLeft;var scrollY=document.documentElement.scrollTop||document.body.scrollTop;this._pos=[(browserWidth/2)-100+scrollX,(browserHeight/2)-150+scrollY];}
this._dialogInput.css('left',this._pos[0]+'px').css('top',this._pos[1]+'px');inst.settings.onSelect=onSelect;this._inDialog=true;this.dpDiv.addClass(this._dialogClass);this._showDatepicker(this._dialogInput[0]);if($.blockUI)
$.blockUI(this.dpDiv);$.data(this._dialogInput[0],PROP_NAME,inst);return this;},_destroyDatepicker:function(target){var $target=$(target);if(!$target.hasClass(this.markerClassName)){return;}
var nodeName=target.nodeName.toLowerCase();$.removeData(target,PROP_NAME);if(nodeName=='input'){$target.siblings('.'+this._appendClass).remove().end().siblings('.'+this._triggerClass).remove().end().removeClass(this.markerClassName).unbind('focus',this._showDatepicker).unbind('keydown',this._doKeyDown).unbind('keypress',this._doKeyPress);}else if(nodeName=='div'||nodeName=='span')
$target.removeClass(this.markerClassName).empty();},_enableDatepicker:function(target){var $target=$(target);if(!$target.hasClass(this.markerClassName)){return;}
var nodeName=target.nodeName.toLowerCase();if(nodeName=='input'){target.disabled=false;$target.siblings('button.'+this._triggerClass).each(function(){this.disabled=false;}).end().siblings('img.'+this._triggerClass).css({opacity:'1.0',cursor:''});}
else if(nodeName=='div'||nodeName=='span'){$target.children('.'+this._disableClass).remove();}
this._disabledInputs=$.map(this._disabledInputs,function(value){return(value==target?null:value);});},_disableDatepicker:function(target){var $target=$(target);if(!$target.hasClass(this.markerClassName)){return;}
var nodeName=target.nodeName.toLowerCase();if(nodeName=='input'){target.disabled=true;$target.siblings('button.'+this._triggerClass).each(function(){this.disabled=true;}).end().siblings('img.'+this._triggerClass).css({opacity:'0.5',cursor:'default'});}
else if(nodeName=='div'||nodeName=='span'){var inline=$target.children('.'+this._inlineClass);var offset=inline.offset();var relOffset={left:0,top:0};inline.parents().each(function(){if($(this).css('position')=='relative'){relOffset=$(this).offset();return false;}});$target.prepend('<div class="'+this._disableClass+'" style="'+
($.browser.msie?'background-color: transparent; ':'')+'width: '+inline.width()+'px; height: '+inline.height()+'px; left: '+(offset.left-relOffset.left)+'px; top: '+(offset.top-relOffset.top)+'px;"></div>');}
this._disabledInputs=$.map(this._disabledInputs,function(value){return(value==target?null:value);});this._disabledInputs[this._disabledInputs.length]=target;},_isDisabledDatepicker:function(target){if(!target)
return false;for(var i=0;i<this._disabledInputs.length;i++){if(this._disabledInputs[i]==target)
return true;}
return false;},_getInst:function(target){try{return $.data(target,PROP_NAME);}
catch(err){throw'Missing instance data for this datepicker';}},_changeDatepicker:function(target,name,value){var settings=name||{};if(typeof name=='string'){settings={};settings[name]=value;}
var inst=this._getInst(target);if(inst){if(this._curInst==inst){this._hideDatepicker(null);}
extendRemove(inst.settings,settings);var date=new Date();extendRemove(inst,{rangeStart:null,endDay:null,endMonth:null,endYear:null,selectedDay:date.getDate(),selectedMonth:date.getMonth(),selectedYear:date.getFullYear(),currentDay:date.getDate(),currentMonth:date.getMonth(),currentYear:date.getFullYear(),drawMonth:date.getMonth(),drawYear:date.getFullYear()});this._updateDatepicker(inst);}},_refreshDatepicker:function(target){var inst=this._getInst(target);if(inst){this._updateDatepicker(inst);}},_setDateDatepicker:function(target,date,endDate){var inst=this._getInst(target);if(inst){this._setDate(inst,date,endDate);this._updateDatepicker(inst);this._updateAlternate(inst);}},_getDateDatepicker:function(target){var inst=this._getInst(target);if(inst&&!inst.inline)
this._setDateFromField(inst);return(inst?this._getDate(inst):null);},
_doKeyDown:function(e){
  var inst=$.datepicker._getInst(e.target);
  var handled=true;
  if($.datepicker._datepickerShowing){
    switch(e.keyCode){
      case 9:
        highlightAccessibilityFocus(inst);
        break;
      case 13:
        inst.settings.currentAccessibilityFocusClass='';
        $.datepicker._selectDay(
          e.target,
          inst.selectedMonth,
          inst.selectedYear,
          $('td.ui-datepicker-days-cell-over',inst.dpDiv)[0]
        );
        return false;
        break;
      case 27:
        inst.settings.currentAccessibilityFocusClass='';
        $.datepicker._hideDatepicker(
          null,
          $.datepicker._get(inst,'duration')
        );
        break;
      case 32:
        customAccessibilitySpaceFunctionality();
        break;
      case 33:
        $.datepicker._adjustDate(
          e.target,
          ((e.ctrlKey || e.metaKey)?-$.datepicker._get(inst,'stepBigMonths'):-$.datepicker._get(inst,'stepMonths')),
          'M'
        );
        break;
      case 34:
        $.datepicker._adjustDate(
          e.target,
          ((e.ctrlKey || e.metaKey)?+$.datepicker._get(inst,'stepBigMonths'):+$.datepicker._get(inst,'stepMonths')),
          'M'
        );
        break;
      case 35:
        if(e.ctrlKey)
          $.datepicker._clearDate(e.target);
        handled=e.ctrlKey;
        break;
      case 36:
        if(e.ctrlKey)
          $.datepicker._gotoToday(e.target);
        handled=e.ctrlKey;
        break;
      case 37:
        $.datepicker._adjustDate(e.target,-1,'D');
        highlightAccessibilityFocusedCell(inst);
        break;
      case 38:
        $.datepicker._adjustDate(e.target,-7,'D');
        highlightAccessibilityFocusedCell(inst);
        break;
      case 39:
        $.datepicker._adjustDate(e.target,+1,'D');
        highlightAccessibilityFocusedCell(inst);
        break;
      case 40:
        $.datepicker._adjustDate(e.target,+7,'D');
        highlightAccessibilityFocusedCell(inst);
        break;
      default:
        handled=false;
    }
  } else if(e.keyCode==36&&e.ctrlKey){
    $.datepicker._showDatepicker(this);
  } else{
    handled=false;
  }
  if(handled){
    e.preventDefault();
    e.stopPropagation();
  }
},_doKeyPress:function(e){var inst=$.datepicker._getInst(e.target);var chars=$.datepicker._possibleChars($.datepicker._get(inst,'dateFormat'));var chr=String.fromCharCode(e.charCode==undefined?e.keyCode:e.charCode);return e.ctrlKey||(chr<' '||!chars||chars.indexOf(chr)>-1);},
_showDatepicker:function(input){
  input=input.target||input;
  if(input.nodeName.toLowerCase()!='input')
    input=$('input',input.parentNode)[0];
  if($.datepicker._isDisabledDatepicker(input)||$.datepicker._lastInput==input)
    return;
  var inst=$.datepicker._getInst(input);
  if(inst.settings.outOfTrapFocusFunction){
    inst.settings.outOfTrapFocusFunction = false;
    return;
  }
  var beforeShow=$.datepicker._get(inst,'beforeShow');
  extendRemove(inst.settings,(beforeShow?beforeShow.apply(input,[input,inst]):{}));
  $.datepicker._hideDatepicker(null,'');
  $.datepicker._lastInput=input;
  $.datepicker._setDateFromField(inst);
  if($.datepicker._inDialog)
    input.value='';
  if(!$.datepicker._pos){
    $.datepicker._pos=$.datepicker._findPos(input);
    $.datepicker._pos[1]+=input.offsetHeight;
  }
  var isFixed=false;
  $(input).parents().each(function(){
    isFixed|=$(this).css('position')=='fixed';
    return!isFixed;
  });
  if(isFixed&&$.browser.opera){
    $.datepicker._pos[0]-=document.documentElement.scrollLeft;
    $.datepicker._pos[1]-=document.documentElement.scrollTop;
  }
  /**
   * July 2023
   * for PE-120638 Modifying the calendar left position to fix RTL alignment
   */
  var offset={left:$.datepicker._pos[0],top:$.datepicker._pos[1]};
  $.datepicker._pos=null;
  inst.rangeStart=null;
  inst.dpDiv.css({position:'absolute',display:'block',top:'-1000px'});
  $.datepicker._updateDatepicker(inst);
  inst.dpDiv.width($.datepicker._getNumberOfMonths(inst)[1]*$('.ui-datepicker',inst.dpDiv[0]).width());
  offset=$.datepicker._checkOffset(inst,offset,isFixed);
  inst.dpDiv.css({
    position:($.datepicker._inDialog&&$.blockUI?'static':(isFixed?'fixed':'absolute')),
    display:'none',
    left: (document.dir === 'rtl') ? (offset.left - (inst.dpDiv.outerWidth() - inst.input.outerWidth()))+'px' : offset.left+'px',top:offset.top+'px'
  });
  if(!inst.inline){
    var showAnim=$.datepicker._get(inst,'showAnim')||'show';
    var duration=$.datepicker._get(inst,'duration');
    var postProcess=function(){
      $.datepicker._datepickerShowing=true;
      if($.browser.msie&&parseInt($.browser.version,10)<7)
        $('iframe.ui-datepicker-cover').css({width:inst.dpDiv.width()+4,height:inst.dpDiv.height()+4});
    };
    if($.effects&&$.effects[showAnim])
      inst.dpDiv.show(showAnim,$.datepicker._get(inst,'showOptions'),duration,postProcess);
    else
      inst.dpDiv[showAnim](duration,postProcess);
    if(duration=='')
      postProcess();
    if(inst.input[0].type!='hidden') {
      trapFocusInsideDatepicker();
    }
    // Handle Escape on input while datepicker is open (before focus enters calendar)
    $(input).off('keydown.datepicker-escape').on('keydown.datepicker-escape', function(e) {
      if (e.keyCode === 27 && ($.datepicker._datepickerShowing || $.datepicker._curInst)) {
        e.preventDefault();
        e.stopPropagation();
        var escInst = $.datepicker._curInst;
        if (escInst) {
          escInst.settings.currentAccessibilityFocusClass = '';
          $.datepicker._hideDatepicker(null, $.datepicker._get(escInst, 'duration'));
        }
        $(this).off('keydown.datepicker-escape');
      }
    });
    $.datepicker._curInst=inst;
  }
},
_updateDatepicker:function(inst){
  var dims={
    width:inst.dpDiv.width()+4,
    height:inst.dpDiv.height()+4
  };
  inst.dpDiv.empty().append(
    this._generateHTML(inst)
  ).find('iframe.ui-datepicker-cover').css({
    width:dims.width,
    height:dims.height
  });
  var numMonths=this._getNumberOfMonths(inst);
  inst.dpDiv[(numMonths[0]!=1||numMonths[1]!=1?'add':'remove')+'Class']('ui-datepicker-multi');
  inst.dpDiv[(this._get(inst,'isRTL')?'add':'remove')+'Class']('ui-datepicker-rtl');
  if(inst.input && inst.input[0].type!='hidden' && inst.settings.currentAccessibilityFocusClass){
    highlightAccessibilityFocus(inst);
  }
},
_checkOffset:function(inst,offset,isFixed){var pos=inst.input?this._findPos(inst.input[0]):null;var browserWidth=window.innerWidth||document.documentElement.clientWidth;var browserHeight=window.innerHeight||document.documentElement.clientHeight;var scrollX=document.documentElement.scrollLeft||document.body.scrollLeft;var scrollY=document.documentElement.scrollTop||document.body.scrollTop;if(this._get(inst,'isRTL')||(offset.left+inst.dpDiv.width()-scrollX)>browserWidth)
offset.left=Math.max((isFixed?0:scrollX),pos[0]+(inst.input?inst.input.width():0)-(isFixed?scrollX:0)-inst.dpDiv.width()-
(isFixed&&$.browser.opera?document.documentElement.scrollLeft:0));else
offset.left-=(isFixed?scrollX:0);if((offset.top+inst.dpDiv.height()-scrollY)>browserHeight)
offset.top=Math.max((isFixed?0:scrollY),pos[1]-(isFixed?scrollY:0)-(this._inDialog?0:inst.dpDiv.height())-
(isFixed&&$.browser.opera?document.documentElement.scrollTop:0));else
offset.top-=(isFixed?scrollY:0);return offset;},_findPos:function(obj){while(obj&&(obj.type=='hidden'||obj.nodeType!=1)){obj=obj.nextSibling;}
var position=$(obj).offset();return[position.left,position.top];},_hideDatepicker:function(input,duration){var inst=this._curInst;if(!inst||(input&&inst!=$.data(input,PROP_NAME)))
return;var rangeSelect=this._get(inst,'rangeSelect');if(rangeSelect&&inst.stayOpen)
this._selectDate('#'+inst.id,this._formatDate(inst,inst.currentDay,inst.currentMonth,inst.currentYear));inst.stayOpen=false;if(this._datepickerShowing){duration=(duration!=null?duration:this._get(inst,'duration'));var showAnim=this._get(inst,'showAnim');var postProcess=function(){$.datepicker._tidyDialog(inst);};if(duration!=''&&$.effects&&$.effects[showAnim])
inst.dpDiv.hide(showAnim,$.datepicker._get(inst,'showOptions'),duration,postProcess);else
inst.dpDiv[(duration==''?'hide':(showAnim=='slideDown'?'slideUp':(showAnim=='fadeIn'?'fadeOut':'hide')))](duration,postProcess);if(duration=='')
this._tidyDialog(inst);var onClose=this._get(inst,'onClose');if(onClose)
onClose.apply((inst.input?inst.input[0]:null),[(inst.input?inst.input.val():''),inst]);this._datepickerShowing=false;this._lastInput=null;inst.settings.prompt=null;if(this._inDialog){this._dialogInput.css({position:'absolute',left:'0',top:'-100px'});if($.blockUI){$.unblockUI();$('body').append(this.dpDiv);}}
this._inDialog=false;}
if(inst&&inst.input){inst.input.off('keydown.datepicker-escape');}
this._curInst=null;},_tidyDialog:function(inst){inst.dpDiv.removeClass(this._dialogClass).unbind('.ui-datepicker');$('.'+this._promptClass,inst.dpDiv).remove();},_checkExternalClick:function(event){if(!$.datepicker._curInst)
return;var $target=$(event.target);if(($target.parents('#'+$.datepicker._mainDivId).length==0)&&!$target.hasClass($.datepicker.markerClassName)&&!$target.hasClass($.datepicker._triggerClass)&&$.datepicker._datepickerShowing&&!($.datepicker._inDialog&&$.blockUI))
$.datepicker._hideDatepicker(null,'');},_adjustDate:function(id,offset,period){var target=$(id);var inst=this._getInst(target[0]);this._adjustInstDate(inst,offset,period);this._updateDatepicker(inst);},_gotoToday:function(id){var target=$(id);var inst=this._getInst(target[0]);if(this._get(inst,'gotoCurrent')&&inst.currentDay){inst.selectedDay=inst.currentDay;inst.drawMonth=inst.selectedMonth=inst.currentMonth;inst.drawYear=inst.selectedYear=inst.currentYear;}
else{var date=new Date();inst.selectedDay=date.getDate();inst.drawMonth=inst.selectedMonth=date.getMonth();inst.drawYear=inst.selectedYear=date.getFullYear();}
this._notifyChange(inst);this._adjustDate(target);},_selectMonthYear:function(id,select,period){var target=$(id);var inst=this._getInst(target[0]);inst._selectingMonthYear=false;inst['selected'+(period=='M'?'Month':'Year')]=inst['draw'+(period=='M'?'Month':'Year')]=parseInt(select.options[select.selectedIndex].value,10);var monthName=inst.drawMonth>=0?this._defaults.monthNames[inst.drawMonth]:'';var year=inst.drawYear||'';this._notifyChange(inst);this._adjustDate(target);setTimeout(function(){var $announceDiv=$('#sr-selected-month-year');$announceDiv.text(monthName+" "+year).focus();},100);},_clickMonthYear:function(id){var target=$(id);var inst=this._getInst(target[0]);if(inst.input&&inst._selectingMonthYear&&!$.browser.msie)
inst.input[0].focus();inst._selectingMonthYear=!inst._selectingMonthYear;},_changeFirstDay:function(id,day){var target=$(id);var inst=this._getInst(target[0]);inst.settings.firstDay=day;this._updateDatepicker(inst);},_selectDay:function(id,month,year,td){if($(td).hasClass(this._unselectableClass))
return;var target=$(id);var inst=this._getInst(target[0]);var rangeSelect=this._get(inst,'rangeSelect');if(rangeSelect){inst.stayOpen=!inst.stayOpen;if(inst.stayOpen){$('.ui-datepicker td',inst.dpDiv).removeClass(this._currentClass);$(td).addClass(this._currentClass);}}
inst.selectedDay=inst.currentDay=$('a',td).html();inst.selectedMonth=inst.currentMonth=month;inst.selectedYear=inst.currentYear=year;if(inst.stayOpen){inst.endDay=inst.endMonth=inst.endYear=null;}
else if(rangeSelect){inst.endDay=inst.currentDay;inst.endMonth=inst.currentMonth;inst.endYear=inst.currentYear;}
this._selectDate(id,this._formatDate(inst,inst.currentDay,inst.currentMonth,inst.currentYear));if(inst.stayOpen){inst.rangeStart=new Date(inst.currentYear,inst.currentMonth,inst.currentDay);this._updateDatepicker(inst);}
else if(rangeSelect){inst.selectedDay=inst.currentDay=inst.rangeStart.getDate();inst.selectedMonth=inst.currentMonth=inst.rangeStart.getMonth();inst.selectedYear=inst.currentYear=inst.rangeStart.getFullYear();inst.rangeStart=null;if(inst.inline)
this._updateDatepicker(inst);}},_clearDate:function(id){var target=$(id);var inst=this._getInst(target[0]);if(this._get(inst,'mandatory'))
return;inst.stayOpen=false;inst.endDay=inst.endMonth=inst.endYear=inst.rangeStart=null;this._selectDate(target,'');},_selectDate:function(id,dateStr){var target=$(id);var inst=this._getInst(target[0]);dateStr=(dateStr!=null?dateStr:this._formatDate(inst));if(this._get(inst,'rangeSelect')&&dateStr)
dateStr=(inst.rangeStart?this._formatDate(inst,inst.rangeStart):dateStr)+this._get(inst,'rangeSeparator')+dateStr;if(inst.input)
inst.input.val(dateStr);this._updateAlternate(inst);var onSelect=this._get(inst,'onSelect');if(onSelect)
onSelect.apply((inst.input?inst.input[0]:null),[dateStr,inst]);else if(inst.input)
inst.input.trigger('change');if(inst.inline)
this._updateDatepicker(inst);else if(!inst.stayOpen){this._hideDatepicker(null,this._get(inst,'duration'));this._lastInput=inst.input[0];if(typeof(inst.input[0])!='object')
inst.input[0].focus();this._lastInput=null;}},_updateAlternate:function(inst){var altField=this._get(inst,'altField');if(altField){var altFormat=this._get(inst,'altFormat');var date=this._getDate(inst);dateStr=(isArray(date)?(!date[0]&&!date[1]?'':this.formatDate(altFormat,date[0],this._getFormatConfig(inst))+
this._get(inst,'rangeSeparator')+this.formatDate(altFormat,date[1]||date[0],this._getFormatConfig(inst))):this.formatDate(altFormat,date,this._getFormatConfig(inst)));$(document).find(altField).each(function(){$(this).val(dateStr);});}},noWeekends:function(date){var day=date.getDay();return[(day>0&&day<6),''];},iso8601Week:function(date){var checkDate=new Date(date.getFullYear(),date.getMonth(),date.getDate(),(date.getTimezoneOffset()/-60));var firstMon=new Date(checkDate.getFullYear(),1-1,4);var firstDay=firstMon.getDay()||7;firstMon.setDate(firstMon.getDate()+1-firstDay);if(firstDay<4&&checkDate<firstMon){checkDate.setDate(checkDate.getDate()-3);return $.datepicker.iso8601Week(checkDate);}else if(checkDate>new Date(checkDate.getFullYear(),12-1,28)){firstDay=new Date(checkDate.getFullYear()+1,1-1,4).getDay()||7;if(firstDay>4&&(checkDate.getDay()||7)<firstDay-3){return 1;}}
return Math.floor(((checkDate-firstMon)/86400000)/7)+1;},dateStatus:function(date,inst){return $.datepicker.formatDate($.datepicker._get(inst,'dateStatus'),date,$.datepicker._getFormatConfig(inst));},parseDate:function(format,value,settings){if(format==null||value==null)
throw'Invalid arguments';value=(typeof value=='object'?value.toString():value+'');if(value=='')
return null;var shortYearCutoff=(settings?settings.shortYearCutoff:null)||this._defaults.shortYearCutoff;var dayNamesShort=(settings?settings.dayNamesShort:null)||this._defaults.dayNamesShort;var dayNames=(settings?settings.dayNames:null)||this._defaults.dayNames;var monthNamesShort=(settings?settings.monthNamesShort:null)||this._defaults.monthNamesShort;var monthNames=(settings?settings.monthNames:null)||this._defaults.monthNames;var year=-1;var month=-1;var day=-1;var doy=-1;var literal=false;var lookAhead=function(match){var matches=(iFormat+1<format.length&&format.charAt(iFormat+1)==match);if(matches)
iFormat++;return matches;};var getNumber=function(match){lookAhead(match);var origSize=(match=='@'?14:(match=='y'?4:(match=='o'?3:2)));var size=origSize;var num=0;while(size>0&&iValue<value.length&&value.charAt(iValue)>='0'&&value.charAt(iValue)<='9'){num=num*10+parseInt(value.charAt(iValue++),10);size--;}
if(size==origSize)
throw'Missing number at position '+iValue;return num;};var getName=function(match,shortNames,longNames){var names=(lookAhead(match)?longNames:shortNames);var size=0;for(var j=0;j<names.length;j++)
size=Math.max(size,names[j].length);var name='';var iInit=iValue;while(size>0&&iValue<value.length){name+=value.charAt(iValue++);for(var i=0;i<names.length;i++)
if(name==names[i])
return i+1;size--;}
throw'Unknown name at position '+iInit;};var checkLiteral=function(){if(value.charAt(iValue)!=format.charAt(iFormat))
throw'Unexpected literal at position '+iValue;iValue++;};var iValue=0;for(var iFormat=0;iFormat<format.length;iFormat++){if(literal)
if(format.charAt(iFormat)=="'"&&!lookAhead("'"))
literal=false;else
checkLiteral();else
switch(format.charAt(iFormat)){case'd':day=getNumber('d');break;case'D':getName('D',dayNamesShort,dayNames);break;case'o':doy=getNumber('o');break;case'm':month=getNumber('m');break;case'M':month=getName('M',monthNamesShort,monthNames);break;case'y':year=getNumber('y');break;case'@':var date=new Date(getNumber('@'));year=date.getFullYear();month=date.getMonth()+1;day=date.getDate();break;case"'":if(lookAhead("'"))
checkLiteral();else
literal=true;break;default:checkLiteral();}}
if(year<100)
year+=new Date().getFullYear()-new Date().getFullYear()%100+
(year<=shortYearCutoff?0:-100);if(doy>-1){month=1;day=doy;do{var dim=this._getDaysInMonth(year,month-1);if(day<=dim)
break;month++;day-=dim;}while(true);}
var date=new Date(year,month-1,day);if(date.getFullYear()!=year||date.getMonth()+1!=month||date.getDate()!=day)
throw'Invalid date';return date;},ATOM:'yy-mm-dd',COOKIE:'D, dd M yy',ISO_8601:'yy-mm-dd',RFC_822:'D, d M y',RFC_850:'DD, dd-M-y',RFC_1036:'D, d M y',RFC_1123:'D, d M yy',RFC_2822:'D, d M yy',RSS:'D, d M y',TIMESTAMP:'@',W3C:'yy-mm-dd',formatDate:function(format,date,settings){if(!date)
return'';var dayNamesShort=(settings?settings.dayNamesShort:null)||this._defaults.dayNamesShort;var dayNames=(settings?settings.dayNames:null)||this._defaults.dayNames;var monthNamesShort=(settings?settings.monthNamesShort:null)||this._defaults.monthNamesShort;var monthNames=(settings?settings.monthNames:null)||this._defaults.monthNames;var lookAhead=function(match){var matches=(iFormat+1<format.length&&format.charAt(iFormat+1)==match);if(matches)
iFormat++;return matches;};var formatNumber=function(match,value,len){var num=''+value;if(lookAhead(match))
while(num.length<len)
num='0'+num;return num;};var formatName=function(match,value,shortNames,longNames){return(lookAhead(match)?longNames[value]:shortNames[value]);};var output='';var literal=false;if(date)
for(var iFormat=0;iFormat<format.length;iFormat++){if(literal)
if(format.charAt(iFormat)=="'"&&!lookAhead("'"))
literal=false;else
output+=format.charAt(iFormat);else
switch(format.charAt(iFormat)){case'd':output+=formatNumber('d',date.getDate(),2);break;case'D':output+=formatName('D',date.getDay(),dayNamesShort,dayNames);break;case'o':var doy=date.getDate();for(var m=date.getMonth()-1;m>=0;m--)
doy+=this._getDaysInMonth(date.getFullYear(),m);output+=formatNumber('o',doy,3);break;case'm':output+=formatNumber('m',date.getMonth()+1,2);break;case'M':output+=formatName('M',date.getMonth(),monthNamesShort,monthNames);break;case'y':output+=(lookAhead('y')?date.getFullYear():(date.getYear()%100<10?'0':'')+date.getYear()%100);break;case'@':output+=date.getTime();break;case"'":if(lookAhead("'"))
output+="'";else
literal=true;break;default:output+=format.charAt(iFormat);}}
return output;},_possibleChars:function(format){var chars='';var literal=false;for(var iFormat=0;iFormat<format.length;iFormat++)
if(literal)
if(format.charAt(iFormat)=="'"&&!lookAhead("'"))
literal=false;else
chars+=format.charAt(iFormat);else
switch(format.charAt(iFormat)){case'd':case'm':case'y':case'@':chars+='0123456789';break;case'D':case'M':return null;case"'":if(lookAhead("'"))
chars+="'";else
literal=true;break;default:chars+=format.charAt(iFormat);}
return chars;},_get:function(inst,name){return inst.settings[name]!==undefined?inst.settings[name]:this._defaults[name];},_setDateFromField:function(inst){var dateFormat=this._get(inst,'dateFormat');var dates=inst.input?inst.input.val().split(this._get(inst,'rangeSeparator')):null;inst.endDay=inst.endMonth=inst.endYear=null;var date=defaultDate=this._getDefaultDate(inst);if(dates.length>0){var settings=this._getFormatConfig(inst);if(dates.length>1){date=this.parseDate(dateFormat,dates[1],settings)||defaultDate;inst.endDay=date.getDate();inst.endMonth=date.getMonth();inst.endYear=date.getFullYear();}
try{date=this.parseDate(dateFormat,dates[0],settings)||defaultDate;}catch(e){this.log(e);date=defaultDate;}}
inst.selectedDay=date.getDate();inst.drawMonth=inst.selectedMonth=date.getMonth();inst.drawYear=inst.selectedYear=date.getFullYear();inst.currentDay=(dates[0]?date.getDate():0);inst.currentMonth=(dates[0]?date.getMonth():0);inst.currentYear=(dates[0]?date.getFullYear():0);this._adjustInstDate(inst);},_getDefaultDate:function(inst){var date=this._determineDate(this._get(inst,'defaultDate'),new Date());var minDate=this._getMinMaxDate(inst,'min',true);var maxDate=this._getMinMaxDate(inst,'max');date=(minDate&&date<minDate?minDate:date);date=(maxDate&&date>maxDate?maxDate:date);return date;},_determineDate:function(date,defaultDate){var offsetNumeric=function(offset){var date=new Date();date.setUTCDate(date.getUTCDate()+offset);return date;};var offsetString=function(offset,getDaysInMonth){var date=new Date();var year=date.getFullYear();var month=date.getMonth();var day=date.getDate();var pattern=/([+-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g;var matches=pattern.exec(offset);while(matches){switch(matches[2]||'d'){case'd':case'D':day+=parseInt(matches[1],10);break;case'w':case'W':day+=parseInt(matches[1],10)*7;break;case'm':case'M':month+=parseInt(matches[1],10);day=Math.min(day,getDaysInMonth(year,month));break;case'y':case'Y':year+=parseInt(matches[1],10);day=Math.min(day,getDaysInMonth(year,month));break;}
matches=pattern.exec(offset);}
return new Date(year,month,day);};date=(date==null?defaultDate:(typeof date=='string'?offsetString(date,this._getDaysInMonth):(typeof date=='number'?(isNaN(date)?defaultDate:offsetNumeric(date)):date)));return(date&&date.toString()=='Invalid Date'?defaultDate:date);},_setDate:function(inst,date,endDate){var clear=!(date);var origMonth=inst.selectedMonth;var origYear=inst.selectedYear;date=this._determineDate(date,new Date());inst.selectedDay=inst.currentDay=date.getDate();inst.drawMonth=inst.selectedMonth=inst.currentMonth=date.getMonth();inst.drawYear=inst.selectedYear=inst.currentYear=date.getFullYear();if(this._get(inst,'rangeSelect')){if(endDate){endDate=this._determineDate(endDate,null);inst.endDay=endDate.getDate();inst.endMonth=endDate.getMonth();inst.endYear=endDate.getFullYear();}else{inst.endDay=inst.currentDay;inst.endMonth=inst.currentMonth;inst.endYear=inst.currentYear;}}
if(origMonth!=inst.selectedMonth||origYear!=inst.selectedYear)
this._notifyChange(inst);this._adjustInstDate(inst);if(inst.input)
inst.input.val(clear?'':this._formatDate(inst)+
(!this._get(inst,'rangeSelect')?'':this._get(inst,'rangeSeparator')+
this._formatDate(inst,inst.endDay,inst.endMonth,inst.endYear)));},_getDate:function(inst){var startDate=(!inst.currentYear||(inst.input&&inst.input.val()=='')?null:new Date(inst.currentYear,inst.currentMonth,inst.currentDay));if(this._get(inst,'rangeSelect')){return[inst.rangeStart||startDate,(!inst.endYear?inst.rangeStart||startDate:new Date(inst.endYear,inst.endMonth,inst.endDay))];}else
return startDate;},_generateHTML:function(inst){var today=new Date();today=new Date(today.getFullYear(),today.getMonth(),today.getDate());var showStatus=this._get(inst,'showStatus');var initStatus=this._get(inst,'initStatus')||'&#xa0;';var isRTL=this._get(inst,'isRTL');

    if (this._get(inst, "mandatory")) {
      var clear = "";
    } else {
      var onClickEvent = 'jQuery.datepicker._clearDate(\'#'+inst.id+'\');';
      clear = $("<div>").addClass("ui-datepicker-clear")
        .append(
          $("<a>")
            .attr(this._addStatusAttribute(onClickEvent, showStatus, inst.id, this._get(inst, "clearStatus"))
            )
            .attr('tabindex', '0')
            .attr('role', 'button')
            .addClass('ui-datepicker-clear-a')
            .text(this._get(inst, "clearText")));
    };

    var onClickEventForControls = "jQuery.datepicker._hideDatepicker();"
    var controls = $("<div>").addClass("ui-datepicker-control")
      .append(isRTL ? "" : clear)
      .append($("<div>")).addClass("ui-datepicker-close")
      .append(
        $("<a>")
          .attr(this._addStatusAttribute(onClickEventForControls, showStatus, inst.id, this._get(inst, "closeStatus"), initStatus))
          .attr('tabindex', '0')
          .attr('role', 'button')
          .addClass('ui-datepicker-close-a')
          .text(this._get(inst, "closeText"))
      )
      .append(isRTL ? clear : "")[0].outerHTML;

    var prompt=this._get(inst,'prompt');var closeAtTop=this._get(inst,'closeAtTop');var hideIfNoPrevNext=this._get(inst,'hideIfNoPrevNext');var navigationAsDateFormat=this._get(inst,'navigationAsDateFormat');var showBigPrevNext=this._get(inst,'showBigPrevNext');var numMonths=this._getNumberOfMonths(inst);var showCurrentAtPos=this._get(inst,'showCurrentAtPos');var stepMonths=this._get(inst,'stepMonths');var stepBigMonths=this._get(inst,'stepBigMonths');var isMultiMonth=(numMonths[0]!=1||numMonths[1]!=1);var currentDate=(!inst.currentDay?new Date(9999,9,9):new Date(inst.currentYear,inst.currentMonth,inst.currentDay));var minDate=this._getMinMaxDate(inst,'min',true);var maxDate=this._getMinMaxDate(inst,'max');var drawMonth=inst.drawMonth-showCurrentAtPos;var drawYear=inst.drawYear;if(drawMonth<0){drawMonth+=12;drawYear--;}
if(maxDate){var maxDraw=new Date(maxDate.getFullYear(),maxDate.getMonth()-numMonths[1]+1,maxDate.getDate());maxDraw=(minDate&&maxDraw<minDate?minDate:maxDraw);while(new Date(drawYear,drawMonth,1)>maxDraw){drawMonth--;if(drawMonth<0){drawMonth=11;drawYear--;}}}
var prevText=this._get(inst,'prevText');prevText=(!navigationAsDateFormat?prevText:this.formatDate(prevText,new Date(drawYear,drawMonth-stepMonths,1),this._getFormatConfig(inst)));var prevBigText=(showBigPrevNext?this._get(inst,'prevBigText'):'');prevBigText=(!navigationAsDateFormat?prevBigText:this.formatDate(prevBigText,new Date(drawYear,drawMonth-stepBigMonths,1),this._getFormatConfig(inst)));

    var onClickEventForBigPrev = "jQuery.datepicker._adjustDate('#" + inst.id + "', -" + stepBigMonths + ", 'M');";
    var onClickEventForPrev = "jQuery.datepicker._adjustDate('#" + inst.id + "', -" + stepMonths + ", 'M');";
    var prev = $("<div>").addClass("ui-datepicker-prev");
    if(this._canAdjustMonth(inst, -1, drawYear, drawMonth)) {
      if(showBigPrevNext) {
        prev.append($("<a>").attr(this._addStatusAttribute(onClickEventForBigPrev, showStatus, inst.id, this._get(inst, "prevBigStatus"), initStatus)).text(prevBigText))
      }
      prev.append($("<a>").attr(this._addStatusAttribute(onClickEventForPrev, showStatus, inst.id, this._get(inst, "prevStatus"), initStatus)).text(prevText))
      //add class to prev a tag
      prev.find('a').addClass('ui-datepicker-prev-a');
      prev.find('a').attr('tabindex', '0');
    } else {
      if(!hideIfNoPrevNext) {
        prev.append($("<label>").text(prevBigText).append($("<label>").text(prevText)))
      }
    };

    var nextText=this._get(inst,'nextText');nextText=(!navigationAsDateFormat?nextText:this.formatDate(nextText,new Date(drawYear,drawMonth+stepMonths,1),this._getFormatConfig(inst)));var nextBigText=(showBigPrevNext?this._get(inst,'nextBigText'):'');nextBigText=(!navigationAsDateFormat?nextBigText:this.formatDate(nextBigText,new Date(drawYear,drawMonth+stepBigMonths,1),this._getFormatConfig(inst)));

    var onClickEventForBigNext = "jQuery.datepicker._adjustDate('#" + inst.id + "', +" + stepBigMonths + ", 'M');";
    var onClickEventForNext = "jQuery.datepicker._adjustDate('#" + inst.id + "', +" + stepMonths + ", 'M');";
    var next = $("<div>").addClass("ui-datepicker-next");
    if(this._canAdjustMonth(inst, -1, drawYear, drawMonth)) {
      next.append($("<a>").attr(this._addStatusAttribute(onClickEventForNext, showStatus, inst.id, this._get(inst, "nextStatus"), initStatus)).text(nextText))
      if(showBigPrevNext) {
        next.append($("<a>").attr(this._addStatusAttribute(onClickEventForBigNext, showStatus, inst.id, this._get(inst, "nextBigStatus"), initStatus)).text(nextBigText))
      }
      //add class to next a tag
      next.find('a').addClass('ui-datepicker-next-a');
      next.find('a').attr('tabindex', '0');
    } else {
      if(!hideIfNoPrevNext) {
        prev.append($("<label>").text(nextText).append($("<label>").text(nextBigText)))
      }
    };

    var currentText=this._get(inst,'currentText');var gotoDate=(this._get(inst,'gotoCurrent')&&inst.currentDay?currentDate:today);currentText=(!navigationAsDateFormat?currentText:this.formatDate(currentText,gotoDate,this._getFormatConfig(inst)));

    var html = null;
      if(prompt) {
        html = $("<div>").addClass(this._promptClass).addText(prompt);
      }
      if(closeAtTop && !inst.inline) {
        if (!html) {
          html = $(controls);
        } else {
          html.append(controls);
        }
      }
      hijriToggle(window.Drupal.settings);//added this method to add toggle the hijri calendar, If we remove this method then the hijri calendar will not be displayed.
      if (!html) {
        html = $("<div>").addClass("ui-datepicker-links");
      } else  {
        html.append($("<div>").addClass("ui-datepicker-links"))
      }

    var onClickEventForCurrent = "jQuery.datepicker._gotoToday('#" + inst.id + "');";

    html = html.append(isRTL ? next : prev)
        .append(this._isInRange(inst, gotoDate)
          ? $("<div>")
            .addClass("ui-datepicker-current")
            .append(
              $("<a>")
                .attr(this._addStatusAttribute(onClickEventForCurrent, showStatus, inst.id, this._get(inst, "currentStatus"), initStatus))
                .text(currentText)
            )
          : ""
        )
        .append(isRTL ? prev : next)
        .prop('outerHTML')

    var firstDay=this._get(inst,'firstDay');
    var changeFirstDay=this._get(inst,'changeFirstDay');
    var dayNames=Drupal.settings.dayNames || this._get(inst,'dayNames');
    var dayNamesShort=Drupal.settings.dayNamesShort || this._get(inst,'dayNamesShort');
    var dayNamesMin=Drupal.settings.dayNamesMin || this._get(inst,'dayNamesMin');
    var monthNames=Drupal.settings.monthNames || this._get(inst,'monthNames');
    var highlightWeek=this._get(inst,'highlightWeek');
    var showOtherMonths=this._get(inst,'showOtherMonths');
    var showWeeks=this._get(inst,'showWeeks');
    var calculateWeek=this._get(inst,'calculateWeek')||this.iso8601Week;
    var weekStatus=this._get(inst,'weekStatus');
    var status=(showStatus?this._get(inst,'dayStatus')||initStatus:'');
    var dateStatus=this._get(inst,'statusForDate')||this.dateStatus;
    var endDate=inst.endDay?new Date(inst.endYear,inst.endMonth,inst.endDay):currentDate;
    var selectDate = window.Drupal.settings.select_date;
    $('#'+this._mainDivId).attr('aria-label', selectDate);

    var beforeShowDay=this._get(inst,'beforeShowDay');
    const dateRange = this._get(inst,'yearRange');
    appendDateMapping(drawYear, drawMonth, dateRange, inst.currentYear, window.Drupal.settings);

    /**appendHijriDate this method will append the Hijri date when FF is enabled */
    function appendHijriDate(settings) {
      if (!isHijriEnabled(settings)) {
          return '';
      }
      let displayedYear = getDisplayedYear(drawYear, inst.currentYear, dateRange);
      const correctDate = new Date(displayedYear, printDate.getMonth(), printDate.getDate());
      return '<div class="month_label_text_dp month_label_hijri_dp_' + formatDateHijri(correctDate) + '" style="' + getHijriVisibility() + '"></div>';
    }

for(var row=0;row<numMonths[0];row++)
for(var col=0;col<numMonths[1];col++){var selectedDate=new Date(drawYear,drawMonth,inst.selectedDay);html+='<div class="ui-datepicker-one-month'+(col==0?' ui-datepicker-new-row':'')+'">'+
this._generateMonthYearHeader(inst,drawMonth,drawYear,minDate,maxDate,selectedDate,row>0||col>0,showStatus,initStatus,monthNames)+'<table class="ui-datepicker" cellpadding="0" cellspacing="0" role="grid" aria-labelledby="ui-datepicker-month-year"><thead>'+'<tr class="ui-datepicker-title-row">'+
(showWeeks?'<td'+this._addStatus(showStatus,inst.id,weekStatus,initStatus)+'>'+
this._get(inst,'weekHeader')+'</td>':'');for(var dow=0;dow<7;dow++){var day=(dow+firstDay)%7;var dayStatus=(status.indexOf('DD')>-1?status.replace(/DD/,dayNames[day]):status.replace(/D/,dayNamesShort[day]));html+='<th scope="col"'+((dow+firstDay+6)%7>=5?' class="ui-datepicker-week-end-cell"':'')+'>'+
(!changeFirstDay?'<span':'<a onclick="jQuery.datepicker._changeFirstDay(\'#'+inst.id+'\', '+day+');"')+
this._addStatus(showStatus,inst.id,dayStatus,initStatus)+' title="'+dayNames[day]+'">'+
dayNamesMin[day]+(changeFirstDay?'</a>':'</span>')+'</th>';}
html+='</tr></thead><tbody tabindex="0" class="ui-datepicker-tbody">';var daysInMonth=this._getDaysInMonth(drawYear,drawMonth);if(drawYear==inst.selectedYear&&drawMonth==inst.selectedMonth)
inst.selectedDay=Math.min(inst.selectedDay,daysInMonth);var leadDays=(this._getFirstDayOfMonth(drawYear,drawMonth)-firstDay+7)%7;var tzDate=new Date(drawYear,drawMonth,1-leadDays);var utcDate=new Date(drawYear,drawMonth,1-leadDays);var printDate=utcDate;var numRows=(isMultiMonth?6:Math.ceil((leadDays+daysInMonth)/7));for(var dRow=0;dRow<numRows;dRow++){html+='<tr class="ui-datepicker-days-row">'+
(showWeeks?'<td class="ui-datepicker-week-col"'+
this._addStatus(showStatus,inst.id,weekStatus,initStatus)+'>'+
calculateWeek(printDate)+'</td>':'');for(var dow=0;dow<7;dow++){var daySettings=(beforeShowDay?beforeShowDay.apply((inst.input?inst.input[0]:null),[printDate]):[true,'']);var otherMonth=(printDate.getMonth()!=drawMonth);var unselectable=otherMonth||!daySettings[0]||(minDate&&printDate<minDate)||(maxDate&&printDate>maxDate);html+='<td class="ui-datepicker-days-cell'+
((dow+firstDay+6)%7>=5?' ui-datepicker-week-end-cell':'')+
(otherMonth?' ui-datepicker-other-month':'')+
(printDate.getTime()==selectedDate.getTime()&&drawMonth==inst.selectedMonth?' ui-datepicker-days-cell-over':'')+
(unselectable?' '+this._unselectableClass:'')+
(otherMonth&&!showOtherMonths?'':' '+daySettings[1]+
(printDate.getTime()>=currentDate.getTime()&&printDate.getTime()<=endDate.getTime()?' '+this._currentClass:'')+
(printDate.getTime()==today.getTime()?' ui-datepicker-today':''))+'"'+
((!otherMonth||showOtherMonths)&&daySettings[2]?' title="'+daySettings[2]+'"':'')+
(unselectable?(highlightWeek?' onmouseover="jQuery(this).parent().addClass(\'ui-datepicker-week-over\');"'+' onmouseout="jQuery(this).parent().removeClass(\'ui-datepicker-week-over\');"':''):' onmouseover="jQuery(this).addClass(\'ui-datepicker-days-cell-over\')'+
(highlightWeek?'.parent().addClass(\'ui-datepicker-week-over\')':'')+';'+
(!showStatus||(otherMonth&&!showOtherMonths)?'':'jQuery(\'#ui-datepicker-status-'+
inst.id+'\').html(\''+(dateStatus.apply((inst.input?inst.input[0]:null),[printDate,inst])||initStatus)+'\');')+'"'+' onmouseout="jQuery(this).removeClass(\'ui-datepicker-days-cell-over\')'+
(highlightWeek?'.parent().removeClass(\'ui-datepicker-week-over\')':'')+';'+
(!showStatus||(otherMonth&&!showOtherMonths)?'':'jQuery(\'#ui-datepicker-status-'+
inst.id+'\').html(\''+initStatus+'\');')+'" onclick="jQuery.datepicker._selectDay(\'#'+
inst.id+'\','+drawMonth+','+drawYear+', this);"')+'>'+
(otherMonth?(showOtherMonths?printDate.getDate():'&#xa0;'):(unselectable?printDate.getDate(): appendHijriDate(window.Drupal.settings) +'<a class="ui-datepicker-cell-a" tabindex="0" aria-label="'+dayNames[(dow+firstDay)%7]+', '+monthNames[drawMonth]+' '+printDate.getDate()+', '+drawYear+'">'+printDate.getDate()+'</a>'))+'</td>';tzDate.setDate(tzDate.getDate()+1);utcDate.setUTCDate(utcDate.getUTCDate()+1);printDate=(tzDate.getHours()==0?tzDate:utcDate);}
html+='</tr>';}
drawMonth++;if(drawMonth>11){drawMonth=0;drawYear++;}
html+='</tbody></table></div>';}
html+=(showStatus?'<div style="clear: both;"></div><div id="ui-datepicker-status-'+inst.id+'" class="ui-datepicker-status">'+initStatus+'</div>':'')+
(!closeAtTop&&!inst.inline?controls:'')+'<div style="clear: both;"></div>'+
($.browser.msie&&parseInt($.browser.version,10)<7&&!inst.inline?'<iframe src="javascript:false;" class="ui-datepicker-cover"></iframe>':'');return html;},_generateMonthYearHeader:function(inst,drawMonth,drawYear,minDate,maxDate,selectedDate,secondary,showStatus,initStatus,monthNames){minDate=(inst.rangeStart&&minDate&&selectedDate<minDate?selectedDate:minDate);var showMonthAfterYear=this._get(inst,'showMonthAfterYear');var html='<div class="ui-datepicker-header"><div id="sr-selected-month-year" aria-live="polite" role="status" style="position: absolute; left: -999999px;"></div>';var monthHtml='';if(secondary||!this._get(inst,'changeMonth'))
monthHtml+=monthNames[drawMonth]+'&#xa0;';else{var inMinYear=(minDate&&minDate.getFullYear()==drawYear);var inMaxYear=(maxDate&&maxDate.getFullYear()==drawYear);monthHtml+='<select class="ui-datepicker-new-month" '+'onchange="jQuery.datepicker._selectMonthYear(\'#'+inst.id+'\', this, \'M\');" '+'onclick="jQuery.datepicker._clickMonthYear(\'#'+inst.id+'\');"'+
this._addStatus(showStatus,inst.id,this._get(inst,'monthStatus'),initStatus)+'>';for(var month=0;month<12;month++){if((!inMinYear||month>=minDate.getMonth())&&(!inMaxYear||month<=maxDate.getMonth()))
monthHtml+='<option value="'+month+'"'+
(month==drawMonth?' selected="selected"':'')+'>'+monthNames[month]+'</option>';}
monthHtml+='</select>';}
if(!showMonthAfterYear)
html+=monthHtml;if(secondary||!this._get(inst,'changeYear'))
html+=drawYear;else{var years=this._get(inst,'yearRange').split(':');var year=0;var endYear=0;if(years.length!=2){year=drawYear-10;endYear=drawYear+10;}else if(years[0].charAt(0)=='+'||years[0].charAt(0)=='-'){year=endYear=new Date().getFullYear();year+=parseInt(years[0],10);endYear+=parseInt(years[1],10);}else{year=parseInt(years[0],10);endYear=parseInt(years[1],10);}
year=(minDate?Math.max(year,minDate.getFullYear()):year);endYear=(maxDate?Math.min(endYear,maxDate.getFullYear()):endYear);html+='<select class="ui-datepicker-new-year" '+'onchange="jQuery.datepicker._selectMonthYear(\'#'+inst.id+'\', this, \'Y\');" '+'onclick="jQuery.datepicker._clickMonthYear(\'#'+inst.id+'\');"'+
this._addStatus(showStatus,inst.id,this._get(inst,'yearStatus'),initStatus)+'>';for(;year<=endYear;year++){html+='<option value="'+year+'"'+
(year==drawYear?' selected="selected"':'')+'>'+year+'</option>';}
html+='</select>';}
if(showMonthAfterYear)
html+=monthHtml;html+='</div>';return html;},_addStatus:function(showStatus,id,text,initStatus){return(showStatus?' onmouseover="jQuery(\'#ui-datepicker-status-'+id+'\').html(\''+(text||initStatus)+'\');" '+'onmouseout="jQuery(\'#ui-datepicker-status-'+id+'\').html(\''+initStatus+'\');"':'');},    _addStatusAttribute: function (onClickEvent, showStatus, id, text, initStatus) {
    return {
      "onclick": onClickEvent,
      "onmouseover": showStatus ? "jQuery('#ui-datepicker-status-" + id + "').html('" + (text || initStatus) + "');" : "",
      "onmouseout": showStatus ? "jQuery('#ui-datepicker-status-" + id + "').html('" + initStatus + "');" : ""
    }
  },_adjustInstDate:function(inst,offset,period){var year=inst.drawYear+(period=='Y'?offset:0);var month=inst.drawMonth+(period=='M'?offset:0);var day=Math.min(inst.selectedDay,this._getDaysInMonth(year,month))+
(period=='D'?offset:0);var date=new Date(year,month,day);var minDate=this._getMinMaxDate(inst,'min',true);var maxDate=this._getMinMaxDate(inst,'max');date=(minDate&&date<minDate?minDate:date);date=(maxDate&&date>maxDate?maxDate:date);inst.selectedDay=date.getDate();inst.drawMonth=inst.selectedMonth=date.getMonth();inst.drawYear=inst.selectedYear=date.getFullYear();if(period=='M'||period=='Y')
this._notifyChange(inst);},_notifyChange:function(inst){var onChange=this._get(inst,'onChangeMonthYear');if(onChange)
onChange.apply((inst.input?inst.input[0]:null),[inst.selectedYear,inst.selectedMonth+1,inst]);},_getNumberOfMonths:function(inst){var numMonths=this._get(inst,'numberOfMonths');return(numMonths==null?[1,1]:(typeof numMonths=='number'?[1,numMonths]:numMonths));},_getMinMaxDate:function(inst,minMax,checkRange){var date=this._determineDate(this._get(inst,minMax+'Date'),null);if(date){date.setHours(0);date.setMinutes(0);date.setSeconds(0);date.setMilliseconds(0);}
return(!checkRange||!inst.rangeStart?date:(!date||inst.rangeStart>date?inst.rangeStart:date));},_getDaysInMonth:function(year,month){return 32-new Date(year,month,32).getDate();},_getFirstDayOfMonth:function(year,month){return new Date(year,month,1).getDay();},_canAdjustMonth:function(inst,offset,curYear,curMonth){var numMonths=this._getNumberOfMonths(inst);var date=new Date(curYear,curMonth+(offset<0?offset:numMonths[1]),1);if(offset<0)
date.setDate(this._getDaysInMonth(date.getFullYear(),date.getMonth()));return this._isInRange(inst,date);},_isInRange:function(inst,date){var newMinDate=(!inst.rangeStart?null:new Date(inst.selectedYear,inst.selectedMonth,inst.selectedDay));newMinDate=(newMinDate&&inst.rangeStart<newMinDate?inst.rangeStart:newMinDate);var minDate=newMinDate||this._getMinMaxDate(inst,'min');var maxDate=this._getMinMaxDate(inst,'max');return((!minDate||date>=minDate)&&(!maxDate||date<=maxDate));},_getFormatConfig:function(inst){var shortYearCutoff=this._get(inst,'shortYearCutoff');shortYearCutoff=(typeof shortYearCutoff!='string'?shortYearCutoff:new Date().getFullYear()%100+parseInt(shortYearCutoff,10));return{shortYearCutoff:shortYearCutoff,dayNamesShort:this._get(inst,'dayNamesShort'),dayNames:this._get(inst,'dayNames'),monthNamesShort:this._get(inst,'monthNamesShort'),monthNames:this._get(inst,'monthNames')};},_formatDate:function(inst,day,month,year){if(!day){inst.currentDay=inst.selectedDay;inst.currentMonth=inst.selectedMonth;inst.currentYear=inst.selectedYear;}
var date=(day?(typeof day=='object'?day:new Date(year,month,day)):new Date(inst.currentYear,inst.currentMonth,inst.currentDay));return this.formatDate(this._get(inst,'dateFormat'),date,this._getFormatConfig(inst));}});function extendRemove(target,props){$.extend(target,props);for(var name in props)
if(props[name]==null||props[name]==undefined)
target[name]=props[name];return target;};function isArray(a){return(a&&(($.browser.safari&&typeof a=='object'&&a.length)||(a.constructor&&a.constructor.toString().match(/\Array\(\)/))));};$.fn.datepicker=function(options){if(!$.datepicker.initialized){$(document.body).append($.datepicker.dpDiv).mousedown($.datepicker._checkExternalClick);$.datepicker.initialized=true;}
var otherArgs=Array.prototype.slice.call(arguments,1);if(typeof options=='string'&&(options=='isDisabled'||options=='getDate'))
return $.datepicker['_'+options+'Datepicker'].apply($.datepicker,[this[0]].concat(otherArgs));return this.each(function(){typeof options=='string'?$.datepicker['_'+options+'Datepicker'].apply($.datepicker,[this].concat(otherArgs)):$.datepicker._attachDatepicker(this,options);});};$.datepicker=new Datepicker();$.datepicker.initialized=false;$.datepicker.uuid=new Date().getTime();})(jQuery);

var GRADE_BY_HIGHEST = 1;
var GRADE_BY_AVERAGE = 2;
var GRADE_BY_DECAYING_AVERAGE = 3;

Drupal.behaviors.sCourseCompetency = function(context){

  // click delegation for the 'show more' of tags
  $('.s-js-chart-and-pager-area:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    $(this).on('click', '.s-js-tag-show-more', function(e){
      var showMoreBtn = $(this);
      var otherText = $('.s-js-the-rest', showMoreBtn).text();
      var parentObj = showMoreBtn.parent();
      var existingPara = parentObj.siblings('.description:first');
      $('.s-js-show-more-ellipsis', existingPara).remove();
      existingPara.text(existingPara.text() + otherText);
      parentObj.remove();
    });
  });

  $('#s-js-student-mastery-report-view.s-js-course-selected:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    var switcher = $('#s-js-student-mastery-report-view-course-switcher', context);
    var contentObj = $('#s-js-student-mastery-report-view-content', context);
    var gpSentence = $('#s-js-student-mastery-report-grading-period', context);
    switcher.select2({
      data : Drupal.settings.s_course_competency.options,
    }).change(function(ev){
      if(gpSentence.length > 0){
        var theSentence = '';
        $.each(Drupal.settings.s_course_competency.options, function(i, v){
          if(v.id == ev.val){
            theSentence = v.date_range;
          }
        });
        gpSentence.html(theSentence);
      }
      // check to see if section is actually a district mastery section which has a different landing page
      if (ev.added.report_type == 'mastery_details') {
        // regular mastery
        location.href = '/course/' + ev.val + '/student_mastery_details';
      } else if (ev.added.report_type == 'mastery_details_dm') {
        // district mastery
        location.href = '/course/' + ev.val + '/student_district_mastery';
      }
      var graphHref =  Drupal.settings.s_course_competency.parent_mode ? '/parent/mastery/student_graphs/' + ev.val : '/course/' + ev.val + '/student_mastery?allow_admin=1';
      sCourseCompetencyLoadMasteryGraphs(graphHref, contentObj, false);
    });
    switcher.select2('val', Drupal.settings.s_course_competency.selected, true);
  });

  // Single user report
  $('.s-js-competency-report-row:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){

    var chartWrapper = $('.s-js-highchart-wrapper', $(this));
    var term_sig = chartWrapper.attr('id').split('-').pop();
    var data = Drupal.settings.s_course_competency.user_chart_data[term_sig];
    
    // DEFENSIVE CHECK: Skip if data is incomplete (PE-141175 fix)
    // Note: data.expectations is only available in single-user report (column chart)
    if(!data || !data.categories || !data.data || !data.expectations){
      console.warn('Skipping chart render - incomplete data for LO: ' + term_sig);
      // Show empty state using consistent HTML structure
      chartWrapper.html(sCourseCompetencyGetEmptyOverlay());
      return; // Continue to next iteration
    }
    var yMax = Drupal.settings.s_course_competency.y_max;
    var yInterval = Drupal.settings.s_course_competency.y_interval;
    var scaleTranslations = Drupal.settings.s_course_competency.scale_translations;
    var addPerc = Drupal.settings.s_course_competency.add_perc;
    var colors = [];
    $.each(data.expectations, function(i, expectation){
      colors[i] = sCourseCompetencyExpectationToColor(expectation);
    });

    var chartOpts = {
      chart : {
        type : 'column',
        height : 180
      },
      xAxis : {
        categories : data.categories,
        min : 0,
        max : 3,
        title : {
          text : null
        },
        labels : {
          formatter : function(){
            if($.inArray(this.value, this.axis.categories) === -1){
              return '';
            }
            return this.value;
          }
        },
        reversed: document.dir === 'rtl'
      },
      yAxis : {
        max : yMax,
        tickInterval : yInterval,
        title : {
          text : null
        },
        opposite : document.dir === 'rtl',
        offset : document.dir === 'rtl' ? 15 : undefined
      },
      title : {
        text : null
      },
      legend : {
        enabled : false
      },
      tooltip : {
        formatter : function(){
          var theValue = this.y;
          if(typeof scaleTranslations[theValue] == 'string'){
            theValue = scaleTranslations[theValue];
          }
          if(addPerc){
            theValue += ' (' + this.y + '%)';
          }
          return theValue;
        },
        borderRadius : 0,
        borderWidth : 1,
        shadow : false,
        backgroundColor : 'rgba(255, 255, 255, 1)',
        useHTML : document.dir === 'rtl'
      },
      credits: {
        enabled: false
      },
      plotOptions: {
          column: {
              shadow : false,
              pointWidth: 50,
              colorByPoint : true,
              colors : colors
          }
      },
      series : [{
        data : data.data
      }]
    };

    if(data.categories.length > 4){
      chartOpts.scrollbar = {
        enabled : true
      };
    }

    chartWrapper.highcharts(chartOpts);
  });

  $('.s-js-competency-learning-objective-row:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    var chartWrapper = $('.s-js-highchart-wrapper', $(this));
    if(chartWrapper.length == 0){
      return true;
    }
    var term_sig = chartWrapper.attr('id').split('-').pop();
    var data = Drupal.settings.s_course_competency.user_chart_data[term_sig];
    
    // DEFENSIVE CHECK: Skip if data is incomplete (PE-141175 fix)
    if(!data || !data.categories || !data.data){
      console.warn('Skipping learning objective chart render - incomplete data for LO: ' + term_sig);
      // Show empty state using consistent HTML structure
      chartWrapper.html(sCourseCompetencyGetEmptyOverlay());
      return; // Continue to next iteration
    }
    
    var meets = Drupal.settings.s_course_competency.user_chart_data.meets;
    var exceeds = Drupal.settings.s_course_competency.user_chart_data.exceeds;
    var yMax = Drupal.settings.s_course_competency.y_max;
    var yInterval = Drupal.settings.s_course_competency.y_interval;
    var scaleTranslations = Drupal.settings.s_course_competency.scale_translations;
    var addPerc = Drupal.settings.s_course_competency.add_perc;
    var plotLinesArr = [{
      value : meets,
      color : '#a0cd8d',
      dashStyle : 'dash',
      width : 1
    },
    {
      value : exceeds,
      color : '#67ac4a',
      dashStyle : 'dash',
      width : 1
    }];
    if(chartWrapper.hasClass('empty')){
      plotLinesArr = [];
    }

    var chartOpts = {
      chart : {
        type : 'boxplot',
        height : 240
      },
      xAxis : {
        categories : data.categories,
        title : {
          text : null
        },
        min : 0,
        max : 3,
        labels : {
          formatter : function(){
            if($.inArray(this.value, this.axis.categories) === -1){
              return '';
            }
            return this.value;
          }
        },
        reversed: document.dir === 'rtl'
      },
      yAxis : {
        title : {
          text : null
        },
        min : 0,
        max : yMax,
        tickInterval : yInterval,
        plotLines : plotLinesArr,
        opposite : document.dir === 'rtl',
        offset : document.dir === 'rtl' ? 15 : undefined
      },
      title : {
        text : null
      },
      legend : {
        enabled : false
      },
      plotOptions: {
          boxplot: {
              shadow : false,
              pointWidth : 50,
              fillColor : '#e4ebf2',
              medianWidth : 1,
              medianColor : '#9ab7d4',
              color : '#c0d0e1'
          }
      },
      tooltip : {
        formatter : function(){
          var highLabel = this.point.high;
          if(typeof scaleTranslations[highLabel] == 'string'){
            highLabel = scaleTranslations[highLabel];
            if(addPerc){
              highLabel += ' (' + this.point.high + '%)';
            }
          }

          var lowLabel = this.point.low;
          if(typeof scaleTranslations[lowLabel] == 'string'){
            lowLabel = scaleTranslations[lowLabel];
            if(addPerc){
              lowLabel += ' (' + this.point.low + '%)';
            }
          }

          var medianLabel = this.point.median;
          if(typeof scaleTranslations[medianLabel] == 'string'){
            medianLabel = scaleTranslations[medianLabel];
            if(addPerc){
              medianLabel += ' (' + this.point.median + '%)';
            }
          }

          var output = '<span>' + Drupal.t('High') + ' : ' + highLabel + '</span>';
          output += '<br/>';
          output += '<span>' + Drupal.t('Low') + ' : ' + lowLabel + '</span>';
          output += '<br/>';
          output += '<span>' + Drupal.t('Median') + ' : ' + medianLabel + '</span>';
          return output;
        },
        borderRadius : 0,
        borderWidth : 1,
        shadow : false,
        backgroundColor : 'rgba(255, 255, 255, 1)',
        useHTML : document.dir === 'rtl'
      },
      credits: {
        enabled: false
      },
      series : [{
        data : data.data
      }]
    };

    if(data.categories.length > 4){
      chartOpts.scrollbar = {
        enabled : true
      };
    }

    chartWrapper.highcharts(chartOpts);
  });

  $('#grade-order-header:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').click(function(){
    var switcherObj = $(this);
    var oppHref =  switcherObj.data('opposite-order');
    var chartArea = switcherObj.parents('.s-js-chart-and-pager-area');
    sCourseCompetencyLoadMasteryGraphs(oppHref, chartArea, false);
  });

  $('.course-competency-more-btn-wrapper:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    $(this).sInfiniteScroll({
      loadMore: function(anchorObj){
        var href = $('a', anchorObj).attr('href');
        var chartArea = anchorObj.parents('.s-js-chart-and-pager-area');
        anchorObj.replaceWith(Drupal.theme.sAjaxLoader({asString : true, imgId : 's-js-user-competency-report'}));
        sCourseCompetencyLoadMasteryGraphs(href, chartArea, true);
      }
    });
  });

  // Course Competency View
  $('#s-js-competency-book-header:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    $('.competency-settings', context).sActionLinks({hidden : false});
  });

  // s_course_competency_thresholds_form
  $('#s-course-competency-thresholds-form:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    var formObj = $(this);
    var sliderObj = $('#s-js-course-competency-slider', formObj);

    /**
     * Jquery Ui slider doesn't supports RTL and the slider bulb is also inverted due to RTL we are using
     * #edit-exceeds as metObj and #edit-meets as exceededObj
     */

    var isRtl = $(document).attr("dir") === "rtl";

    if(isRtl)
    {
      var metObj = $('#edit-exceeds', formObj);
      var exceededObj = $('#edit-meets', formObj);
    }
    else
    {
      var metObj = $('#edit-meets', formObj);
      var exceededObj = $('#edit-exceeds', formObj);
    }

    /**
     * Jquery Ui slider doesn't supports RTL and we wanted the slider from 100 to 0
     * so to achieve these
     * we are running slider from -100 to 0
     * when user select any value we simply multiply the value to -1 to show positive value
     * in values we also need to invert the values because large positive values in negetive becomes smaller values
     */
    var sliderOpts = {
      values : isRtl ? [metObj.val() * -1, exceededObj.val() * -1] : [metObj.val(), exceededObj.val()],
      max : isRtl ? 0 : 100,
      min : isRtl ? -100 : 0,
      range : true,
      slide : function(event, ui){
        if(isRtl)
        {
          // multiplying the value with -1 as we need to show positive values
          metObj.val(Math.min(ui.values[0], ui.values[1]) * -1);
          exceededObj.val(Math.max(ui.values[0], ui.values[1]) * -1);
        }
        else
        {
          metObj.val(Math.min(ui.values[0], ui.values[1]));
          exceededObj.val(Math.max(ui.values[0], ui.values[1]));
        }

        sCourseCompetencySetLeftSlideWidth();
      },
      create : function(event,ui){
        sliderObj.prepend('<div id="ui-slider-range-left"></div>');
        sCourseCompetencySetLeftSlideWidth();
      },
      stop : function(event, ui){
        sCourseCompetencySetLeftSlideWidth();
      }
    };

    function sCourseCompetencySetLeftSlideWidth(){
      if(isRtl)
      {
        var right = $('.ui-slider-range', sliderObj).css('right');
      }
      else
      {
        var left = $('.ui-slider-range', sliderObj).css('left');
      }

      $('#ui-slider-range-left', sliderObj).css('width', isRtl ? right : left);
    }

    sliderObj.slider(sliderOpts);
    sliderObj.trigger('slide');
    sPopupsResizeCenter();

    var scaleSelectObj = $('#edit-grading-scale-id', formObj);
    scaleSelectObj.change(function(){
      var newVal = parseInt($(this).val());
      var setMaxStr = '100%';
      var setMax = 100;
      var setMinStr = '0%';
      var setMin = 0;
      var setMinLabelStr = '% ' + Drupal.t('Minimum');
      if(typeof Drupal.settings.sCourseCompetency.pointScales[newVal] == 'object'){
        setMax = parseInt(Drupal.settings.sCourseCompetency.pointScales[newVal].max);
        setMin = parseInt(Drupal.settings.sCourseCompetency.pointScales[newVal].min);
        var setMaxStr = Drupal.settings.sCourseCompetency.pointScales[newVal].max;
        var setMinStr = Drupal.settings.sCourseCompetency.pointScales[newVal].min;
        setMinLabelStr = Drupal.t('Minimum');
      }
      $('.competency-slider-scale', formObj).html($('.competency-slider-scale .min', formObj).text(setMinStr).prop('outerHTML') + setMaxStr);
      $('.perc-sign', formObj).text(setMinLabelStr);

      if(isRtl)
      {
        // Inverting as positive value become smaller when multiplied with -1
        sliderObj.slider("option", "min", -1 * +setMax);
        sliderObj.slider("option", "max", -1 * +setMin);
      }
      else
      {
        sliderObj.slider("option", "min", setMin);
        sliderObj.slider("option", "max", setMax);
      }

      var arr = isRtl ? [-1 * +metObj.val(), -1 * +exceededObj.val()] : [metObj.val(), exceededObj.val()];
      sliderObj.slider("value", arr);
      sCourseCompetencySetLeftSlideWidth();
    });
    scaleSelectObj.change();
  });

  $('.s-js-toggle-fullscreen-btn:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    var $button = $(this);
    
    $button.on('click', function(e){
      e.preventDefault();
      $('body').toggleClass('fullscreen-enabled');
      $(window).triggerHandler('resize');
    });
    
    $button.on('keydown', function(e){
      if (isEnterOrSpaceKeyEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
        $('body').toggleClass('fullscreen-enabled');
        $(window).triggerHandler('resize');
      }
    });
  });

  $('#competency-wrapper:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').each(function(){
    var wrapperObj = $(this);
    sAngular.on('sCourseCompetencyLoad', function(courseNid, data){
      var noMembers = true;
      var noTags = !data.hasTags;
      $.each(data.enrollments, function(i, enrollment){
        if(enrollment.id){
          noMembers = false;
        }
        // one iteration should do the trick
        return false;
      });
      var noMasteryResult = noTags || noMembers;
      if(noMasteryResult) {
        setTabindexForLinks(wrapperObj);
      }
      if(noMasteryResult && !wrapperObj.find('.s-js-no-members-overlay').length) {
        wrapperObj.prepend(Drupal.theme('s_course_no_members_overlay', courseNid, noMembers, noTags));
      }
      wrapperObj.toggleClass('overlay-active', noMasteryResult);
      wrapperObj.find('.s-js-no-members-overlay').toggleClass('hidden', !noMasteryResult);
    });
  });

  $('#edit-grade-by:not(.sCourseCompetency-processed)', context).addClass('sCourseCompetency-processed').on('change', function() {
    if($(this).val() == GRADE_BY_DECAYING_AVERAGE) {
      $('#observation-weight').show();
    } else {
      $('#observation-weight').hide();
    }

    sPopupsResizeCenter();
  }).trigger('change');
};

function sCourseCompetencyLoadMasteryGraphs(href, contentArea, appendToTable){
  sToggleActiveLoader('mastery-loader', contentArea);
  $.get(href, {loadMoreAjax : 1}, function(data){
    var content = $(data.content);
    var pager = $(data.pager);

    // Add new rows to table
    if(appendToTable){
      tableObj = $('table:not(.sticky-header)', contentArea);
      $('tbody', tableObj).append($('tbody tr', content));
      $('#s-js-user-competency-report').remove();
    }
    else{
      contentArea.empty();
      contentArea.append(content);
    }

    // Add pager (if it exists) into page
    contentArea.append(pager);

    // Add new chart data
    Drupal.settings.s_course_competency.user_chart_data = data.user_chart_data;
    Drupal.settings.s_course_competency.y_max = data.y_max;
    Drupal.settings.s_course_competency.y_interval = data.y_interval;
    Drupal.settings.s_course_competency.scale_translations = data.scale_translations;
    Drupal.settings.s_course_competency.add_perc = data.add_perc;

    // Attach behaviors
    sAttachBehaviors(['sCourseCompetency', 'sCommonInfotip'],contentArea);
    sToggleActiveLoader('mastery-loader');
  });
}


function sCourseCompetencyExpectationToColor(expectation){
  expectation = parseInt(expectation);
  switch(expectation){
    case 1:
      return '#E5ACAC';
    case 2:
      return '#a0cd8d';
    case 3:
      return '#67ac4a';
  }
  return 'red';
}

/**
 * Sets the tabindex attribute to -1 for all anchor elements within the 
 * #competency-table element found inside the provided wrapper object.
 *
 * @param {Object} wrapperObj - The jQuery object that contains the #competency-table element.
 */
function setTabindexForLinks(wrapperObj) {
  setTimeout(function() {
    var links = wrapperObj.find('#competency-table a');
    links.each(function() {
      this.setAttribute('tabindex', '-1');
    });
  }, 100);
}

/**
 * JavaScript equivalent of _s_course_competency_get_empty_overlay()
 * Generates the same HTML structure and styling as the PHP function
 * @returns {string} HTML for empty state overlay
 */
function sCourseCompetencyGetEmptyOverlay() {
  var emptyOverlay = '<div class="no-data-overlay">' +
    '<div class="no-data-message">' +
    '<span class="no-data-message-wrapper">' +
    '<span class="inline-icon medium gradebook-gray mono"></span>' +
    Drupal.t('There are no achievement levels for any items aligned to this objective') +
    '</span></div>' +
    '</div>';
  return emptyOverlay;
}

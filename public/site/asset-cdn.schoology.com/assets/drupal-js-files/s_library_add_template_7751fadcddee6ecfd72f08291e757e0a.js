
var sLibraryActivePopup = null;

function sLibraryRubricForms()
{
    return [
    '#s-library-collection-template-form',
    '#s-library-assessment-question-edit-form',
    '#s-library-question-edit-form',
    '#s-library-assessment-question-fill-form',
    ];
}

Drupal.behaviors.sLibraryAddTemplate = function (context) {
    $(sLibraryRubricForms().join(':not(.sLibraryAddTemplateProcessed), '), context).addClass('sLibraryAddTemplateProcessed').each(function () {
        var form = $(this);
        var form_settings = Drupal.settings.s_library_add_template;
        var attachmentWarning = false;

        $('#edit-template-body',form).elastic();

      // delete button on rubric placeholder
        $('#rubric-placeholder .delete-btn',form).click(function () {
          //show dialog
            var popupSettings = {
                extraClass: 'popups-small',
                title: Drupal.t('Delete'),
                body: Drupal.t('Removing this rubric will remove all of learning objectives aligned from this question. Would you like to remove this rubric?'),
                confirm: {
                    text: Drupal.t('Delete'),
                    func: function () {
                        sAlignmentClearAlignments(true);
                        sAlignmentEnableAlignmentButton();

                      // clear jsonRubric inside hidden form element
                        $('[name=resource_rubric]', form).val('');
                      // replace rubric placeholder rubric select dropdown with
                        $('#rubric-placeholder', form).addClass('hidden');
                        $('#edit-grading-scale-id-button', form).removeClass('hidden');
                        $('.option-show-scale', form).addClass('hidden');
                        $('#edit-chosen-rubric:not(.display-only)', form).addClass('hidden');

                      // enable max points input
                        $('#edit-template-fields-max-points', form)
                        .val(100)
                        .prop('disabled', false)
                        .removeClass('disabled');

                      // reset default selection
                        $('#edit-grading-scale-id').selectmenu('value', 0);

                        Popups.activePopup().close();
                    }
                }
            }
            sCommonConfirmationPopup(popupSettings);
        });

        form.bind('sLibraryResourceMaterialRubricUpdated', function (event, rubric) {
          // disable alignment button
            sAlignmentDisableAlignmentButton();
          // clear existing alignments
            sAlignmentClearAlignments();

            jsonRubric = JSON.stringify(rubric);

          // store jsonRubric inside hidden form element
            $('[name=resource_rubric]', form).val(jsonRubric);

          // replace rubric select dropdown with rubric placeholder
            $('#edit-grading-scale-id-button', form).addClass('hidden');
            $('#rubric-placeholder', form).removeClass('hidden');

          // hidden select form needs to reflect that a scale is selected (and is not 'r' or 'e')
            $('#edit-grading-scale-id').val('0');

          // set and disable max points input
            $('#edit-template-fields-max-points', form)
            .prop('disabled', true)
            .addClass('disabled')
            .val(rubric.total_points);

          // set placeholder title
            $('#rubric-placeholder #rubric-placeholder-title').text(rubric.title);

            sAlignmentRubricUpdate(rubric);

        });

        sAttachBehavior('schoologyAngular', form);

        switch (form_settings.template_type) {
            default:
                $('#edit-template-fields-body:not(.s-tinymce-load-editor)',form).elastic();
          break;
            case 'page':
          break;
            case 'assessment':
                $('#edit-template-fields-body',form).elastic();
          break;
        }

        $('#edit-grading-scale-id:not(.sLibraryAddTemplateProcessed)', form).each(function () {
            var dropdown = $(this);
            var editChosenRubric = $('#edit-chosen-rubric:not(.display-only)', form);
            dropdown.selectmenu({style : 'dropdown'});
            dropdown.change(function () {
                sLibraryChangeRubric(form, dropdown);
            });
            editChosenRubric.click(function () {
                editChosenRubric.val('e');
                sLibraryChangeRubric(form, dropdown, editChosenRubric);
            });
        });

        $('.attachment-block:not(.sLibraryAddTemplateProcessed)', form).each(function () {
            var block = $(this);
            $('.delete-btn.delete-attachment', block).click(function () {
                var aid = $(this).attr('id').split('-').pop();
                $('.attachment-delete-' + aid, form).val(1);
                block.remove();
                if (!attachmentWarning) {
                    form.prepend('<div class="attachment-warning">' + Drupal.t("Your attachments will not be removed until you submit the form") + '</div>');
                    attachmentWarning = true;
                }
                sPopupsResizeCenter();
            })
        });

        $(document).bind('popups_open_path_done', function () {
            sPopupsResizeCenter();
        });

      // if the form alread has a rubric selected
        if ($('[name=resource_rubric]').val()) {
            sAlignmentDisableAlignmentButton();
            var rubric = JSON.parse($('[name=resource_rubric]').val());

          // show rubric edit btn and 'Show to students' checkbox
            $('.option-show-scale', form).removeClass('hidden');
            $('#edit-chosen-rubric:not(.display-only)', form).removeClass('hidden');
            $('#edit-chosen-rubric:not(.display-only)').val(rubric.id)
          // replace rubric select dropdown with rubric placeholder
            $('#edit-grading-scale-id-button', form).addClass('hidden');
            $('#rubric-placeholder', form).removeClass('hidden');

          // set and disable max points input
            $('#edit-template-fields-max-points', form)
            .prop('disabled', true)
            .addClass('disabled')
            .val(rubric.total_points);

          // set placeholder title
            $('#rubric-placeholder #rubric-placeholder-title').text(rubric.title);

            sAlignmentRubricUpdate(rubric);
        }

    });

    $('.resources-additional-info-wrapper:not(.sLibraryAddTemplateProcessed)', context).addClass('sLibraryAddTemplateProcessed').each(function () {
        var levelElement = $('#edit-grade-level-range-start', context);
        var show_resource_info_fields = (
        $('#edit-description', context).val() != '' ||
        (levelElement.length ? levelElement.val() != '' : false) ||
        $('#edit-use-category', context).val() != 0 ||
        $('#edit-tags', context).val() != ''
        );

        if (show_resource_info_fields) {
            $('.resources-additional-info-wrapper', context).removeClass('hidden');
            $('#resource-info-selector', context).addClass('active');
            sPopupsResizeCenter();
            sCommonGradeChooserBehavior($('.template-grade-chooser', context));
        }
    });

    $('#resource-info-selector:not(.sLibraryAddTemplate-processed)', context).addClass('sLibraryAddTemplate-processed').each(function () {
        if (!$(this).hasClass('disabled')) {
            $(this).click(function () {
                $('.resources-additional-info-wrapper', context).removeClass('hidden');
                $(this).addClass('active');
                sPopupsResizeCenter();
                sCommonGradeChooserBehavior($('.template-grade-chooser', context));
            });
        }
    });

  // radio button action for rubric selection
    $('#collection-view-contents:not(.sLibrary-processed)').addClass('sLibrary-processed').each(function () {
        var context = $(this);
        $('.form-radio', context).each(function () {
            $(this).bind('click', function () {
                var btnObj = $(this);
                $('.form-radio', context).each(function () {
                    $(this).prop('checked', btnObj.attr('id') == $(this).attr('id'));
                });
            });
        });
    });

  // submit button for rubric select popup
    $('.popups-import-library:not(.sLibrary-processed)').addClass('sLibrary-processed').each(function () {
        var context = $(this);
        $('#edit-submit-buttons-submit', context).click(function () {
          // if this is not a rubric selector, just return
            var is_rubric = $(this).attr("is_rubric");
            if (is_rubric != 1) {
                return true;
            }

            var selectedRubric = $('.form-radio:checked', context);
            if (selectedRubric.length) {
                var rubricId = selectedRubric.val().substring(2);
                var rubricText = $('#template-rubric-rows-data-' + rubricId, context).val();
                var rubric = JSON.parse(rubricText);

                Popups.activePopup().close();
                if (sLibraryActivePopup) {
                    Popups.resizeAndCenter(sLibraryActivePopup);
                }
                var form = sLibraryRubricForms().join(', ');
                var wrapper = $('#edit-grading-scale-id-wrapper', form);
                var selectMenuItem = $('select', wrapper);

                var rubricChangeCallback = function (result) {
                  // result is true of the user acknowledges that LOs will change
                    if (result) {
                        var alignment_btn = $('#edit-grading-scale-id-button', form);
                        alignment_btn.addClass('disabled disabled-rubric-selected');
                        alignment_btn.removeClass('active');
                        alignment_btn.addClass('hidden');

                        sAlignmentDisableAlignmentButton();
                        sAlignmentRubricUpdate(rubric);

                      // store jsonRubric inside hidden form element
                        $('[name=resource_rubric]', form).val(rubricText);

                        $('#rubric-placeholder', form).removeClass('hidden');
                        $('#edit-chosen-rubric', form).removeClass('hidden');
                        $('.option-show-scale', form).removeClass('hidden');
                        $('#edit-chosen-rubric:not(.display-only)', form).removeClass('hidden');

                      // set and disable max points input
                        $('#edit-template-fields-max-points', form)
                        .prop('disabled', true)
                        .addClass('disabled')
                        .val(rubric.total_points);

                      // set placeholder title
                        $('#rubric-placeholder #rubric-placeholder-title', form).text(rubric.title);

                      // hidden select form needs to reflect that a scale is selected (and is not 'r' or 'e')
                        $('#edit-grading-scale-id').val('0');

                      // Clear any alignments already selected
                        sAlignmentResetAttachedAlignments(true);
                    } else {
                      // set default placeholder '--'
                        $('#edit-grading-scale-id').selectmenu('value', 0);
                    }
                };

              // popup a confirmation dialog to continue
                if (sAlignmentGetActiveIdStore().val()) {
                    sReplaceLearningObjectivesPopup(form, selectMenuItem, rubric.title, rubricChangeCallback);
                } else {
                    rubricChangeCallback(true);
                }
            } else {
              // present an error message
                var form = $('#s-library-import-select-wrapper-form', context);
                if (!form.hasClass('error-message-displayed')) {
                    form.prepend('' +
                      '<div class="messages error">' +
                      '<div class="messages-close-btn" style="display: block;">x</div>' +
                      '<div class="messages-container">' +
                      '<table role="presentation"><tbody><tr><td><div class="messages-icon">&nbsp;</div></td><td>' +
                      '<div class="message-text">' + Drupal.t('You must select a rubric to continue.') + '</div>' +
                      '</td></tr></tbody></table>' +
                      '</div>' +
                      '</div>');
                    form.addClass('error-message-displayed');
                }
                sPopupsResizeCenter();
            }
            return false;
        });

      // cancel button for the rubrics selector
        $('a.cancel-btn', context).click(function () {
            Popups.activePopup().close();
            if (sLibraryActivePopup) {
                Popups.resizeAndCenter(sLibraryActivePopup);
            }
            $('#edit-grading-scale-id').selectmenu('value', 0);
            return false;
        });
    });

}

function sLibraryChangeRubric(form, gsSelectObj, editChosenRubric)
{
    if (typeof editChosenRubric != 'undefined') {
        var newVal = editChosenRubric.val();
    } else {
        var gsSelectArea = gsSelectObj.parents('.grading-scale-select-grouping');
        var newVal = gsSelectObj.val();
    }
    $('#edit-chosen-rubric:not(.display-only)', form).val(newVal);
    if (newVal == 'e') {
        $('#grading-rubric-launch-btn', form).click();
      // show rubric edit btn and 'Show to students' checkbox
        $('.option-show-scale', gsSelectArea).removeClass('hidden');
        $('#edit-chosen-rubric:not(.display-only)', gsSelectArea).removeClass('hidden');
    } else if (newVal == 'r') {
        sToggleActiveLoader('rubric-import', gsSelectObj);
        const $parentCollectionNid = sGetParentCollectionNid();
        let $url = '/resources/my/import/select?ajax=1&import_view=4&include_left_menu=1'; // S_LIBRARY_IMPORT_VIEW_TYPE_RUBRICS
        if ($parentCollectionNid != null) {
            $url += '&parent_collection_nid=' + $parentCollectionNid;
        }
        $.ajax({
            type: "GET",
            url: $url,
            dataType: "json",
            success: function (json) {
                sLibraryActivePopup = Popups.activePopup();
                var popup = new Popups.Popup();
                popup.extraClass = 'popups-large popups-import-library popups-library';
                popup.open(Drupal.t('Select Rubric to Copy'), json.output);
                var drupalBehaviors = [
                'sLibrary',
                'sLibraryLeftNav',
                'sLibraryAddTemplate',
                'sLibraryActionLinks',
                'sLibraryAjaxedLinks',
                'sAttachmentForm',
                'extlink',
                'popups',
                'sCommonInfotip',
                'sAttachMainRole',
                'schoologyAngular'
                ];
                var popupBody = $('div.popups-body', popup.element);
                sAttachBehaviors(drupalBehaviors, popupBody);
                sToggleActiveLoader('rubric-import');
                Popups.resizeAndCenter(popup);
            }
        });
    } else {
      // clear json resource rubric
        $('[name=resource_rubric]', form).val('');
      // show rubric edit btn and 'Show to students' checkbox
        $('.option-show-scale', gsSelectArea).addClass('hidden');
        $('#edit-chosen-rubric:not(.display-only)', gsSelectArea).addClass('hidden');
    }
}

function sGradeScaleClearRubricSelection(gsSelectArea)
{
    $('.option-show-scale', gsSelectArea).addClass('hidden');
    $('#edit-chosen-rubric:not(.display-only)', gsSelectArea).addClass('hidden');
    sAlignmentClearAlignments(true);
    sAlignmentEnableAlignmentButton();
}

function sGetParentCollectionNid()
{
    return $('input[name=collection_nid]').val();
}

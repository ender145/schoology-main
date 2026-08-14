'use strict';

/**
 * Declare app level module which depends on filters, and services
 */
angular.module('googleDriveApp', ['googleDriveApp.controllers', 'googleDriveApp.directives', 'googleDriveApp.services', 'sCommon.directives']);


/**
 * Controllers
 */
angular.module('googleDriveApp.controllers', []).
controller('GoogleDriveCtlr', ['$scope', 'Files', '$window', 'Schoology', '$timeout', 'Google',
  function($scope, Files, $window, Schoology, $timeout, Google) {
  var CI = $window.CI;
  var ROOT_FOLDER = { id: 'root', mimeType: 'application/vnd.google-apps.folder' };

  $scope.messages = [];
  $scope.files = [];
  $scope.checkedFiles = [];
  $scope.selectAllCheckbox = false;
  $scope.showToolbarUpBtn = false;
  $scope.showActiveTableLoader = true;
  $scope.showToolbarEditMenu = false;
  $scope.showPopupLoader = false;
  $scope.loadMoreParams = {
    folder: ROOT_FOLDER,
    nextPageToken: '',
    searchTerm: ''
  };
  $scope.currentCopyAction = '';
  $scope.googleDrivePickerInitialized = false;

  var popupClose = function() {
    // prevent initialization errors, later version of jq-ui-dialog handles this gracefully
    var dialogModel = $('#dialog-modal');
    // catch UI "esc" key press or fired close event (not the same as cancel)
    if (dialogModel.hasClass('ui-dialog-content')) {
      dialogModel.dialog("destroy");
    }
  };

  $scope.popup = {
    url: '',
    type: '#dialog-modal',
    data: {selectedFile: '', addType: ''},
    opts: {
      dialogClass: '',
      title: '',
      modal: true,
      draggable: false,
      resizable: false,
      position: {my: "center top", at: "center top+110", of: $window}},
      close: popupClose
  };

  function breadCrumbs() {
    this.crumbs = [];
    this.add = function(file) {
      this.crumbs.push(file);
    };
    this.get = function(i) {
      // get current or by index
      i = i == undefined ? this.crumbs.length - 1 : i;
      return this.crumbs[i];
    };
    this.clear = function() {
      this.crumbs = [];
    };
    this.goBack = function() {
      this.crumbs.pop();
      $scope.goTo(this.crumbs.pop());
    };
    this.showUpBtn = function() {
      return this.crumbs.length > 1;
    }
  }
  $scope.breadCrumbs = new breadCrumbs();

  /*
      ###############################################################
      ### Controller methods                                      ###
      ###############################################################
  */

  /**
   * Go to the root folder
   */
  $scope.goToRoot = function() {
    $scope.goTo(ROOT_FOLDER);
  };

  /**
   * Infinite scroll handler
   */
  $scope.loadMore = function() {
    if (!$scope.loadMoreParams.nextPageToken) {
      return;
    }

    $scope.retry.record(function() {
      $scope.loadMore();
    });

    $scope.showActiveTableLoader = true;

    Files.get({
      fid: $scope.loadMoreParams.folder.id,
      nextPageToken: $scope.loadMoreParams.nextPageToken,
      searchTerm: $scope.loadMoreParams.searchTerm,
    }, function(response) {
      $.merge($scope.files, response.files);
      $scope.showActiveTableLoader = false;
      $scope.loadMoreParams.nextPageToken = response.next;
      $scope.retry.successCallback();
    });
  };

  /**
   * Go to file, listing folder contents if folder; otherwise
   * launch popup in new window with file contents
   *
   * @param {object} file The selected file object
   * @param {string=} searchTerm The optional search term
   */
  $scope.goTo = function(file, searchTerm) {
    if (file.mimeType == 'application/vnd.google-apps.folder') {
      $scope.retry.record(function() {
        $scope.goTo(file, searchTerm);
      });
    }

    file = (file === ROOT_FOLDER.id || file.id === ROOT_FOLDER.id) ? ROOT_FOLDER : file;
    searchTerm = searchTerm || '';

    if (file.mimeType == 'application/vnd.google-apps.folder') {
      // Either general loader or the search one should be displayed
      // The search loader is displayed if it is a search query
      // or if the root folder is requested after the search term was reset
      $scope.search.loading = (searchTerm !== '') || (search.getLastTerm() !== '' && file === ROOT_FOLDER);
      $scope.showActiveTableLoader = !$scope.search.loading;

      // If we don't actually perform any search, but just open the folder then reset the search box
      if (searchTerm === '') {
        search.cancel(true);
      }

      Files.get({
        fid: file.id,
        searchTerm: searchTerm
      }, function (response) {
        // Populate parameters that are used for "Load More" action
        $scope.loadMoreParams.folder = file;
        $scope.loadMoreParams.nextPageToken = response.next;
        $scope.loadMoreParams.searchTerm = searchTerm;

        // Populate the file list
        $scope.files = $.merge([], response.files);
        $scope.checkedFiles = [];

        // Clear the breadcrumbs if we are back to root folder e.g. after search results are cleared
        if (file === ROOT_FOLDER) {
          $scope.breadCrumbs.clear();
          $scope.breadCrumbs.add(file);
        }
        // If it was a search query we don't want to add the same folder twice
        else if (!searchTerm) {
          $scope.breadCrumbs.add(file);
        }

        // We don't want to display "Up" button for root folder as well as for the search results
        $scope.showToolbarUpBtn = (file !== ROOT_FOLDER) && !searchTerm;

        // Disable both loaders - we don't care which one was actually enabled
        $scope.showActiveTableLoader = false;
        $scope.search.loading = false;
        $scope.retry.successCallback();
      });
    } else {
      $window
        .open(file.alternateLink, 'newWin_' + file.id, "height=600,width=1000")
        .focus();
    }
  };

  // manage checkboxes; update "checked" list of file ids
  $scope.updateSelected = function($event, file) {
    var cbx = $($event.target);
    var table = cbx.parents('table');
    var checked = cbx.attr('checked') == undefined ? false : true;

    if(file == undefined) {
      for(var i = 0; i < $scope.files.length; i++) {
        if($scope.files[i].ng.showCheckbox) {
          $scope.files[i].ng.isChecked = checked;
        }
      }
    }

    $scope.selectFiles($scope.files);
  };

  // copy/import checked files to schoology
  $scope.selectMultiCopyTo = function(action) {
    $scope.retry.record(function() {
      $scope.selectMultiCopyTo(action);
    });

    $scope.importSelectedItems(action);
  };

  // clear selection
  $scope.clearSelection = function() {
    $scope.selectAllCheckbox = false;
    for(var i = 0; i < $scope.files.length; i++) {
      $scope.files[i].ng.isChecked = false;
    }
    $scope.checkedFiles = [];
  };

  $scope.deleteItem = function(file) {
    $scope.showPopupLoader = true;
    $($scope.popup.type + " .popups-content").html('');
    var url = CI.helpers.s_url('index.php/drive/popups/delete/'+file.id+'?uid=' + Date.now());
    $scope.popup.url = url;
    $scope.popup.opts.title = CI.helpers.s_lang('general_delete');
    $scope.popup.opts.dialogClass = 'popups-delete-item';
    $scope.popup.data.selectedFile = file;
    $($scope.popup.type).dialog($scope.popup.opts);
  };

  $scope.googleApiOnLoad = function() {
    gapi.load('picker', function () {
      $scope.googleDrivePickerInitialized = true;
      $scope.$apply();
    });
  };

  $scope.selectGoogleDriveFiles = async function() {
    $scope.showActiveTableLoader = true;
    const token = await Google.getToken();

    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setSelectFolderEnabled(false)
      .setIncludeFolders(true);

    $scope.googleDrivePicker = new google.picker.PickerBuilder()
      .setAppId(CI.helpers.get_app_id())
      .setDeveloperKey(CI.helpers.get_dev_key())
      .setOAuthToken(token)
      .setOrigin(CI.helpers.get_site_base())
      .setLocale(CI.helpers.get_locale())
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback($scope._googleDrivePickerCallback)
      .addView(view)
      .setTitle(CI.helpers.s_lang('general_select_files'))
      .build();

    $scope.googleDrivePicker.setVisible(true);

    $scope.showActiveTableLoader = false;
    $scope.$apply(); // forces loader to clear
  };

  $scope._googleDrivePickerCallback = function(response) {
    switch (response.action) {
      case google.picker.Action.PICKED: {
        $scope._destroyGoogleDrivePicker();
        $scope.goToRoot();
        break;
      }
      case google.picker.Action.CANCEL: {
        $scope._destroyGoogleDrivePicker();
        break;
      }

      default: {
        // the drive picker api will call this callback with undocumented actions.
        // ignore them.
      }
    }
  };

  $scope._destroyGoogleDrivePicker = function() {
    $scope.googleDrivePicker.dispose();
    $scope.googleDrivePicker = null;
  }

  $scope.addGoogleDoc = function(type) {
    $scope.showPopupLoader = true;
    $($scope.popup.type + " .popups-content").html('');
    var url = CI.helpers.s_url('index.php/drive/popups/add?uid=' + Date.now());
    $scope.popup.url = url;
    switch(type) {
      case 'doc':
        $scope.popup.data.addType = 'doc';
        $scope.popup.opts.title = CI.helpers.s_lang('general_drive_toolbar_create_doc');
        $scope.popup.opts.dialogClass = 'popups-add-doc';
        break;

      case 'spreadsheet':
        $scope.popup.data.addType = 'spreadsheet';
        $scope.popup.opts.title = CI.helpers.s_lang('general_drive_toolbar_create_sheets');
        $scope.popup.opts.dialogClass = 'popups-add-spreadsheet';
        break;

      case 'presentations':
        $scope.popup.data.addType = 'presentations';
        $scope.popup.opts.title = CI.helpers.s_lang('general_drive_toolbar_create_slides');
        $scope.popup.opts.dialogClass = 'popups-add-presentations';
        break;

      case 'drawing':
        $scope.popup.data.addType = 'drawing';
        $scope.popup.opts.title = CI.helpers.s_lang('general_drive_toolbar_create_drawing');
        $scope.popup.opts.dialogClass = 'popups-add-drawing';
        break;

      case 'folder':
        $scope.popup.data.addType = 'folder';
        $scope.popup.opts.title = CI.helpers.s_lang('general_drive_toolbar_create_folder');
        $scope.popup.opts.dialogClass = 'popups-add-folder';
        break;
    }
    $($scope.popup.type).dialog($scope.popup.opts);
  };

  $scope.importItems = function(action) {
    $scope.showPopupLoader = true;
    $($scope.popup.type + " .popups-content").html('');
    var url = CI.helpers.s_url('index.php/drive/popups/import?uid=' + Date.now() + '&action=' + action);
    $scope.popup.url = url;
    switch(action) {
      case 'file':
        $scope.popup.opts.title = CI.helpers.s_lang('general_import_file');
        break;

      case 'link':
        $scope.popup.opts.title = CI.helpers.s_lang('general_import_link');
        break;

      case 'link_private':
        $scope.popup.opts.title = CI.helpers.s_lang('general_import_link_private');
        break;

      case 'embed':
        $scope.popup.opts.title = CI.helpers.s_lang('general_import_embed');
        break;
    }
    $scope.popup.opts.dialogClass = 'popups-import-item';
    $scope.popup.opts.close = function() {
      $scope.$apply(function(){
        $scope.clearSelection();
      });
      popupClose();
    };

    /**
     * Previously this popup remained open since after processing the selections, the
     * user's browser is redirected to Schoology for import destination selection. Now we must
     * ensure that the previous dialog is closed since this could have been initiated by a "retry"
     */
    popupClose();
    $($scope.popup.type).dialog($scope.popup.opts);
  };

  $scope.popupLoaded = function() {
    $scope.showPopupLoader = false;
  };

  $scope.itemIsSelectedClass = function(checked) {
    return checked ? 'selected-row' : '';
  };

  $scope.updateActiveTableLoader = function(loaderClass) {
    $scope.showActiveTableLoader = loaderClass;
  };

  $scope.selectFiles = function(files) {
    var checkedFiles = [];
    for(var i = 0; i < files.length; i++) {
      if(files[i].ng.isChecked) {
        checkedFiles.push({
          id: files[i].id,
          downloadUrl: files[i].downloadUrl,
          title: files[i].title,
          mimeType: files[i].mimeType,
          exportLinks: files[i].exportLinks,
          alternateLink: files[i].alternateLink,
          embedLink: files[i].embedLink,
          permissions: files[i].permissions,
          ng: files[i].ng
        });
      }
    }
    $scope.checkedFiles = checkedFiles;
  };

  $scope.importContent = function(file, action) {
    var is_file = file.mimeType != 'application/vnd.google-apps.folder';
    if(is_file) {
      $scope.retry.record(function() {
        $scope.importContent(file, action);
      });

      $scope.clearSelection();
      file.ng.isChecked = true;
      $scope.selectFiles([file]);
      $scope.importSelectedItems(action);
    }
  };

  $scope.showCopyAction = function(file, action) {
    var actionPerm = {
      file: 'showActionImportFile',
      link: 'showActionImportLink',
      link_private: 'showActionImportLinkPrivate',
      embed: 'showActionImportEmbed'
    };
    return file.ng[ actionPerm[action] ];
  };

  $scope.showSelectMultiAction = function(action) {
    for(var i = 0; i < $scope.checkedFiles.length; i++) {
      if(!$scope.showCopyAction($scope.checkedFiles[i], action)) {
        return false;
      }
    }
    return true;
  };

  /**
   * @param {string} action
   */
  $scope.importSelectedItems = function(action) {
    if($scope.checkedFiles.length < 1) {
      return;
    }

    $scope.currentCopyAction = action;
    $scope.importItems(action);
  };

  $scope.notifications = {
    /**
     * Clear messages
     */
    clear: function () {
      $scope.messages = [];
    },

    /**
     * Set message, clearing previously displayed messages
     */
    set: function(message) {
      $scope.messages = [message];
    },

    /**
     * Add message
     */
    add: function(message) {
      $scope.messages.push(message);
    }
  };

  ////////////////////////////////
  // Google Drive Search: BEGIN //
  ////////////////////////////////

  var search = $scope.search = {
    DEBOUNCE_DELAY: 500,
    AUTO_SEARCH_TERM_MIN_LENTH: 3,

    isEnabled: CI.settings.google_drive_search.is_enabled,
    isAuto: CI.settings.google_drive_search.is_auto,

    term: '',
    loading: false,
    silent: false,

    /**
     * Initialize the Google Drive search
     */
    initialize: function() {
      if (!this.isEnabled) {
        return;
      }

      $scope.$watch('search.term', _.debounce(function(term) {
        // debounce uses setTimeout, so we need to wrap this in $scope.$apply() to update the model
        $scope.$apply(function(){
          // If we explicitly set that the change handler should not be trigger any events then exit
          if (search.silent) {
            search.silent = false;
            return;
          }

          // We don't perform search for short search terms or twice for the same term
          if (term !== '' && term.length < search.AUTO_SEARCH_TERM_MIN_LENTH || search.getLastTerm() === term) {
            return;
          }

          // Make sure that when the search term is cleared we go to the root folder
          if (term === '') {
            $scope.goToRoot();
          } else if (search.isAuto) {
            search.go();
          }
        });
      }, search.DEBOUNCE_DELAY));
    },

    /**
     * Perform the search for the entered term
     */
    go: function() {
      if (!this.isEnabled) {
        return;
      }

      var term = $.trim(this.term);
      if (!search.searchTermIsValid(term)) {
        return;
      }

      // Probably later we will like to perform the search within current folder only
      // but for now we just send the current for the consistency with the borwsing API
      $scope.goTo(this.getCurrentFolder(), term);
    },

    /**
     * Clear the search term
     *
     * @param {boolean=} silent If true then the change event handler won't be triggered
     */
    cancel: function(silent) {
      if (this.term !== '') {
        this.term = '';
        this.silent = !!silent;
      }
    },

    /**
     * Get the term that was used for the last search transaction which results are currently displayed.
     * If last transaction was not search but a regular folder browsing then empty string will be returned.
     *
     * @returns {string}
     */
    getLastTerm: function() {
      return $scope.loadMoreParams.searchTerm;
    },

    /**
     * Returns TRUE if the search has been performed and there are search results are currently displayed
     *
     * @returns {boolean}
     */
    isActive: function() {
      return !!this.getLastTerm();
    },

    /**
     * Get currently browsed folder
     *
     * @returns {object} File object of the current folder
     */
    getCurrentFolder: function() {
      return $scope.loadMoreParams.folder;
    },

    /**
     * Whether or not the search has been performed and no results found
     *
     * @returns {boolean}
     */
    noResultsFound: function() {
      return this.isActive() && $scope.files.length === 0;
    },

    /**
     * Whether or not the search term is valid
     *
     * @param {string=} term The given search term
     * @returns {boolean}
     */
    searchTermIsValid: function(term) {
      return !(!term
        || search.getLastTerm() === term
        || search.loading
      );
    }
  };

  search.initialize();

  //////////////////////////////
  // Google Drive Search: END //
  //////////////////////////////

  $scope.retry = {
    actionCallback: null,
    showOverlay: false,
    showOverlayLoader: false,
    retryTimeout: CI.settings.google_drive_retry.timeout,

    /**
     * Retry success callback
     */
    successCallback: function() {
      $scope.notifications.clear();
      $scope.retry.showOverlay = false;
      $scope.retry.showOverlayLoader = false;
    },

    /**
     * Retry error callback
     */
    errorCallback: function() {
      $scope.retry.showOverlayLoader = false;
    },

    /**
     * Record the action for playback later
     *
     * @param {function} actionCallback The action callback
     */
    record: function(actionCallback) {
      $scope.retry.actionCallback = actionCallback;
    },

    /**
     * Execute the last recorded action
     */
    play: function () {
      $scope.retry.displayOverlay(true);

      // show new message while the application attempts retry
      $scope.notifications.set({
        type: 'error',
        text: CI.helpers.s_lang('google_drive_api_retry')
      });

      // set retry to execute after specified timeout
      $timeout(function() {
        $scope.retry.actionCallback();
      }, CI.settings.google_drive_retry.timeout * 1000);
    },

    /**
     * Display blocking retry overlay
     *
     * @param {boolean} withLoader If true then display the loader image
     */
    displayOverlay: function(withLoader) {
      $scope.retry.showOverlay = true;
      $scope.retry.showOverlayLoader = withLoader;
    }
  };


  /*
     ###############################################################
     ### Init Controller                                         ###
     ###############################################################
  */

  // register error handlers
  var error_handler = function(data, status, headers, config) {
    // for retry, dont stack the errors since we dont have support/need for fading or closable messages
    if (data.isRetryable) {
      $scope.notifications.set(data);
      $scope.retry.displayOverlay(false);
    }
    else {
      $scope.notifications.add(data);
    }
    // clear loaders and overlays
    $scope.showActiveTableLoader = false;
    if ($scope.popup) { $scope.popup.close(); }
    $scope.retry.errorCallback();
  };
  Files.error_handler = error_handler;
  Schoology.error_handler = error_handler;

  // get root list of files
  $scope.goToRoot();

}]).
controller('AccountSettingsCtlr', ['$scope', '$window', function($scope, $window) {
  var CI = $window.CI;
  var account = CI.settings.account_settings.account;
  $scope.logoutError = '';

  $scope.auth_url = CI.settings.account_settings.default_auth_url;
  $scope.showLogoutBtn = {personal: false, school: false };

  $scope.googleConnect = function(authUrl) {
    if($scope.auth_url.indexOf('oauth_school') == -1 && CI.settings.page.context_hints.is_mobile == false) {
      var authwin = $window.open($scope.auth_url, 'authwindow', "height=600,width=1000");
      authwin.focus();
    }
    else {
      location.href = $scope.auth_url;
    }
  };

  $scope.toggleLogoutBtn = function(account_type) {
    $scope.showLogoutBtn.personal = false;
    $scope.showLogoutBtn.school = false;

    if(account.email == '') {
      return;
    }

    if(account_type == 'personal') {
      $scope.showLogoutBtn.personal = true;
    }
    else if(account_type == 'school') {
      $scope.showLogoutBtn.school = true;
    }
  };
  $scope.toggleLogoutBtn(account.type);

  $scope.changeAuthLink = function() {
    var account_type = $scope.auth_url.indexOf('accounts.google.com') == -1 ? 'personal' : '';
    $scope.toggleLogoutBtn(account_type);
  };

  $scope.accountLogoutConfirm = function(account_type) {
    if(account_type != 'personal') {
      return;
    }

    var popup_opts = {
      dialogClass: 'popups-personal-logout',
      title: CI.helpers.s_lang('general_account_logout'),
      modal: true,
      draggable: false,
      resizable: false,
      position: {my: "center top", at: "center top+110", of: $window},
      close : function() {
        $("#dialog-modal-logout").dialog("destroy");
      }
    };
    $('#dialog-modal-logout').dialog(popup_opts);
  };

  $scope.accountLogout = function() {
    var csrfToken = CI.settings.account_settings.csrf_token;
    $scope.logoutError = '';

    $.ajax({
      url: '/drive/remove_account',
      type: 'POST',
      data: { csrf_token: csrfToken },
      success: function() {
        location.href = '/drive';
      },
      error: function() {
        $scope.$apply(function() {
          $scope.logoutError = CI.helpers.s_lang('logout_session_timeout');
        });
      }
    });
  };

  $scope.cancelLogout = function() {
    $scope.logoutError = '';
    $('#dialog-modal-logout').dialog("destroy");
  };

}]).
controller('PopupsAddGoogleDocCtlr', ['$scope', 'Files', function($scope, Files) {
  $scope.googleDocTitleInputField = '';

  $scope.submitFile = function() {
    var dialogModel = $('#dialog-modal');

    $scope.retry.record(function() {
      $scope.submitFile();
    });

    $scope.updateActiveTableLoader(true);
    Files.add({type: $scope.popup.data.addType, title: $scope.googleDocTitleInputField, folder_id: $scope.breadCrumbs.get().id},
      function(response){
        $scope.googleDocTitleInputField = '';
        $scope.files.push(response.files);
        $scope.updateActiveTableLoader(false);
        $scope.retry.successCallback();
    });

    if (dialogModel.hasClass('ui-dialog-content')) {
      dialogModel.dialog("destroy");
    }
  };

  $scope.cancel = function() {
    $scope.googleDocTitleInputField = '';
    $("#dialog-modal").dialog("destroy");
  };

}]).
controller('PopupsDeleteCtlr', ['$scope', 'Files', function($scope, Files) {

  function findFileItemIndexById (files, id) {
    for(var i = 0; i < files.length; i++) {
      if(files[i].id == id) {
        return i;
      }
    }
  }

  $scope.deleteFile = function() {
    var dialogModel = $('#dialog-modal');

    $scope.retry.record(function() {
      $scope.deleteFile();
    });

    var selectedFileId = $scope.popup.data.selectedFile.id;
    var delIndex = findFileItemIndexById($scope.files, selectedFileId);
    // hide action menu, show loader
    $scope.files[delIndex].ng.showActionLinks = false;
    $scope.files[delIndex].ng.showRowLoader = true;
    Files.del({files: selectedFileId},
      function(response){
        $scope.files.splice(delIndex, 1);
        $scope.retry.successCallback();
    });

    if (dialogModel.hasClass('ui-dialog-content')) {
      dialogModel.dialog("destroy");
    }
  };

  $scope.cancel = function() {
    $("#dialog-modal").dialog("destroy");
  };

}]).
controller('PopupsImportCtlr', ['$scope', 'Files', 'Schoology', function($scope, Files, Schoology) {
  var importType = $scope.currentCopyAction ? $scope.currentCopyAction : 'file';
  var selectedItems = angular.copy($scope.checkedFiles);
  var totalSelectedItems = selectedItems.length;
  var importedItems = [];

  $scope.importer = {
    currentTitle: '',
    importType: importType,
    total: totalSelectedItems,
    completed: importedItems.length,
    progress: 0,
    progressBarWidth: {'width': '0%'}
  };

  /**
   * Process using content import or content return workflow
   */
  function processQueue() {
    // our ui-modal should be visible, exit queue if the modal was closed
    if(!$($scope.popup.type).is(":visible")) {
      return;
    }
    var nextItem = selectedItems.splice(0, 1);
    $scope.importer.currentTitle = Files.getCurrentFileTitle(nextItem[0]);

    var importFileHandler = function(response){
      // our ui-modal should be visible, exit queue if the modal was closed
      if(!$($scope.popup.type).is(":visible")) {
        return;
      }

      importedItems.push(response.content[0]);
      var progress = ( (importedItems.length / totalSelectedItems) * 100 );
      var progress = Math.floor( progress );
      $scope.importer.progress = progress;
      $scope.importer.progressBarWidth.width = progress + '%';
      $scope.importer.completed = importedItems.length;

      // continue processing selected items
      if(selectedItems.length > 0) {
        processQueue();
      }
      // we are finished, send content to Schoology
      else {
        var data = {
          importUrl: response.import_url,
          returnUrl: response.return_url,
          content: importedItems
        };
        Schoology.send(data, CI.settings.page.context_hints.is_editor_insert ? 'insert' : 'import');
      }
    };
    Files.copy({files: nextItem, type: $scope.importer.importType}, importFileHandler);
  }
  processQueue();

  $scope.cancel = function() {
    $("#dialog-modal").dialog("destroy");
  };

}]);



/**
 * Directives
 */
angular.module('googleDriveApp.directives', []).
directive('sActionLinksWrapper', [function() {
   return {
    restrict: 'A',
    transclude: true,
    template: '<div class="action-links-wrapper" ng-transclude></div>',
    link : function(scope, element, attrs){
      element.sActionLinks({hidden: false, wrapper: '.add-resource-action-links'});
    }
  };
}]).
directive('sStickHeader', [function() {
   return {
    restrict: 'A',
    link : function(scope, element, attrs){
      var offsetTop = $(element).offset().top;
      $(window).scroll(function(){
        if( $(window).scrollTop() > offsetTop ) {
          $(element).addClass('sticky').css({position: 'fixed', top: '0px', 'background-color': '#fff'});
        } else {
          $(element).removeClass('sticky').css({position: 'static', top: '0px', 'background-color': '#fff'});
        }
      });
    }
  };
}]).
directive('sLoadMore', ['$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
   return {
    restrict: 'A',
    link : function(scope, element, attrs){
      $window = $($window);
      $window.on('scroll.sLoadMore',function(e){
        if( !$(element).isBelowFold() && !scope.showActiveTableLoader ) {
          scope.$apply(attrs.sLoadMore);
        }
      });
    }
  };
}]).
directive('sEnter', function() {
  /**
   * <input s-enter="handler()" /> - executes the handler on the "Enter" key press.
   * If no explicit handler specified then ng-click handler will be executed
   */
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.bind('keydown keypress', function(event) {
        if (event.which === 13) {
          var handler = attrs.sEnter || attrs.ngClick;

          if (handler) {
            scope.$apply(function() {
              scope.$eval(handler, { $event: event });
            });
          }

          event.preventDefault();
        }
      });
    }
  }
});



/**
 * Services
 */
angular.module('googleDriveApp.services', []).
service('Files', ['$http', '$window', function($http, $window){
  var s = {
    error_handler: function(){}
  };
  var CI = $window.CI;

  function setFileDefaults(file) {
    var canCopy = (
      (file.mimeType != 'application/vnd.google-apps.folder') &&
      (file.mimeType != 'application/vnd.google-apps.form')
    );
    var canEdit = (
     (file.mimeType == 'application/vnd.google-apps.document') ||
     (file.mimeType == 'application/vnd.google-apps.spreadsheet') ||
     (file.mimeType == 'application/vnd.google-apps.presentation') ||
     (file.mimeType == 'application/vnd.google-apps.drawing') ||
     (file.mimeType == 'application/vnd.google-apps.form')
    );

    file.ng = {
      showCheckbox: canCopy,
      showActionLinks: true,
      showActionLinkEdit: canEdit,
      showActionImportFile: canCopy,
      showActionImportLink: canCopy,
      showActionImportLinkPrivate: canCopy,
      showActionImportEmbed: (canCopy && file.embedLink != null),
      showRowLoader: false,
      isChecked: false
    };
    return file;
  }

  s.get = function(data, callback){
    var url = CI.helpers.s_url('index.php/iapi/files/listing/' + data.fid);
    var config = {
      params: {
        searchTerm: data.searchTerm || '',
        nextPageToken: data.nextPageToken != undefined ? data.nextPageToken : ''
      }
    };

    $http.get(url, config).
    success(function(response){
      for(var i = 0; i < response.files.length; i++) {
        response.files[i] = setFileDefaults(response.files[i]);
      }
      callback(response);
    }).
    error(s.error_handler);
  };

  s.del = function(data, callback){
    var url = CI.helpers.s_url('index.php/iapi/files/del');
    $http.post(url, data).
    success(function(response){
      callback(response);
    }).
    error(s.error_handler);
  };

  s.add = function(data, callback){
    var url = CI.helpers.s_url('index.php/iapi/files/add/'+data.type);
    $http.post(url, data).
    success(function(response){
      response.files = setFileDefaults(response.files);
      callback(response);
    }).
    error(s.error_handler);
  };

  s.copy = function(data, callback){
    var url = CI.helpers.s_url('index.php/iapi/files/import');
    $http.post(url, data).
    success(function(response){
      callback(response);
    }).
    error(s.error_handler);
  };

  s.getCurrentFileTitle = function(item) {
    var title = item.title;

    switch(item.mimeType) {
      case 'application/vnd.google-apps.document':
        title += '.docx';
        break;

      case 'application/vnd.google-apps.spreadsheet':
        title += '.xlsx';
        break;

      case 'application/vnd.google-apps.presentation':
        title += '.pptx';
        break;

      case 'application/vnd.google-apps.drawing':
        title += '.png';
        break;
    }

    return title;
  };

  return s;
}]).
service('Schoology', ['$window', function($window){
  var s = {
    error_handler: function(){}
  };
  var CI = $window.CI;

  s.send = function(data, op){
    if(op == 'insert') {
      s.insert(data);
    }
    else if(op == 'import') {
      s.import(data);
    }
  };

  s.insert = function(data){
    if(data.content.length < 1) {
      s.error_handler('Please select content', 500);
      return;
    }

    var sendUrl = data.importUrl + '?return_url=' + data.returnUrl;

    // redirect user to Schoology insert handler
    $('#s-js-post-redirect-form').remove();
    var form = $('<form>', {attr:{
      id: 's-js-post-redirect-form',
      style: 'display: none;',
      method: 'POST',
      action: sendUrl
    }});

    var supported_fields = ['type', 'url', 'title', 'width', 'height'];
    for(var i in data.content) {
      $.each(supported_fields, function(k, field){
        if(data.content[i][field]) {
          $('<input>', {attr: {
            type: 'hidden',
            name: 'content['+i+']['+ field +']',
            value: data.content[i][field]
          }}).appendTo(form);
        }
      });
    }

    $('body').append(form);
    form.submit();
  };

  s.import = function(data){
    if(data.content.length < 1) {
      s.error_handler('Please select content', 500);
      return;
    }

    var sendUrl = data.importUrl + '?';
    for(var i = 0; i < data.content.length; i++) {
      sendUrl += 'import_id[]=' + data.content[i].id + '&';
    }
    sendUrl += 'return_url=' + data.returnUrl;

    // redirect user to Schoology import handler
    location.href = sendUrl;
  };

  return s;
}]).
service('Google', ['$http', '$window', function ($http, $window) {
  const s = {
    error_handler: function() {}
  };
  const CI = $window.CI;

  s.getToken = async function() {
    const url = CI.helpers.s_url('index.php/iapi/google/get_token');
    const response = await $http.get(url);
    if (response.status === 200) {
      return response.data.token;
    } else {
      s.error_handler('Could not get token', 500);
    }
  };

  return s;
}]);

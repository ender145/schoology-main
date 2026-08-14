CI.helpers = {};
CI.helpers.s_url = function(url) {
  var basepath = CI.settings.page.basepath;
  url = basepath + url;
  return url;
};

CI.helpers.get_locale = function() {
  return CI.settings.page.locale;
};

CI.helpers.get_app_id = function() {
  return CI.settings.page.appid;
};

CI.helpers.get_dev_key = function() {
  return CI.settings.page.devkey;
};

CI.helpers.get_site_base = function() {
  return CI.settings.page.sitebase;
};

CI.helpers.s_lang = function(k, args) {
  // Fetch the localized version of the string.
  if (CI.lang && CI.lang[k]) {
    str = CI.lang[k];
  }

  if (args) {
    // Transform arguments before inserting them
    for (var key in args) {
      switch (key.charAt(0)) {
        case '%':
        default:
          // Escaped and emphasized
          args[key] = '<em>' + args[key] + '</em>';
          break;

        case '@':
          // Escaped only
          args[key] = CI.helpers.s_html_escape(args[key]);
        break;

        case '!':
          // Pass-through
          break;
      }
      str = str.replace(key, args[key]);
    }
  }
  return str;
};


CI.helpers.s_html_escape = function(str) {
  str = String(str);
  var replace = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' };
  for (var character in replace) {
    var regex = new RegExp(character, 'g');
    str = str.replace(regex, replace[character]);
  }
  return str;
};

$.fn.isBelowFold = function(){
  return ($(window).height() + $(window).scrollTop()) <= this.offset().top;
};

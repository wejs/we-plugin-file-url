/**
 * We.js client side lib
 */

(function (we) {

we.components.urlSelector = {
  addUrl: function(eid, name) {
    var self = this;
    var element = $(eid+'-fs');
    var url = element.val();

    if (url && url.trim && url.trim()) {
      this.saveUrlDataInBackend({
        url: url.trim()
      }, function(err, result) {
        element.val('');
        self.showFieldData(eid, name, result);
      });
    }
  },
  showFieldData: function(fieldSelector, name, file) {
    var row = $(fieldSelector + 'FieldTemplates tr').clone();
    row.find('td[data-file-name]').html(
      file.url +
      '<input name="'+name+'" type="hidden" value="'+file.id+'">'
    );

    if ($(fieldSelector).attr('data-multiple') !== 'true'){
      $(fieldSelector + 'BTNSelector').hide();
    }

    $(fieldSelector + 'Table tbody').append(row);
    $(fieldSelector + 'Table').show();
  },

  removeUrl: function(e, selector) {
    if (confirm('Tem certeza que deseja remover esse conteúdo?')) {
      var tbody = $(e).parent().parent().parent();
      $(e).parent().parent().remove();
      if (!tbody.find('tr').length) {
        $(selector + 'BTNSelector').show();
        $(selector + 'Table').hide();
      }
    }
  },

  saveUrlDataInBackend: function(data, cb) {
    $.ajax({
      type: 'POST',
      url: '/file-url',
      data: data
    })
    .then( function (result) {
      if (result && result.id) {
        cb(null, result);
      } else if (result && result['file-url']) {
        cb(null, result['file-url']);
      } else {
        cb('unknow response');
      }
    })
    .fail( function(err) {
      cb(err);
      return null;
    });
  }
};

})(window.we);
/**
 * Main plugin file
 */

module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);

  plugin.setConfigs({
    permissions: {}
  });

  plugin.setRoutes({
    'post /file-url': {
      controller: 'file-url',
      action: 'saveFileUrl',
      responseType: 'json',
      permission: 'create_file-url'
    },
    'get /api/v1/url/get-form-modal-content': {
      controller: 'file-url',
      action: 'getFormModalContent',
      model: 'file-url',
      responseType: 'modal',
      permission: true
    }
  });

  plugin.setModelsFileField = function setModelsFileField (we, done) {
    let f, models = we.db.modelsConfigs;
    const setModelFileField = we.plugins['we-plugin-file'].setModelFileField;

    for (var modelName in models) {
      if (models[modelName].options) {
        if (models[modelName].options.urlFields) {
          for (f in models[modelName].options.urlFields) {
            setModelFileField (
              models[modelName],
              f,
              models[modelName].options.urlFields[f],
              we,
              'file/url'
            );
          }
        }
      }
    }
    done();
  };

  plugin.hooks.on('we:models:before:instance', plugin.setModelsFileField);

  plugin.addJs('we.component.urlSelector', {
    weight: 20,
    pluginName: 'we-plugin-file-url',
    path: 'files/public/we.components.urlSelector.js'
  });

  return plugin;
};
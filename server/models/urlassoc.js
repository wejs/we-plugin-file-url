/**
 * Video association model
 */

module.exports = function Model (we) {
  const model = {
    definition: {
      modelName: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      modelId: {
        type: we.db.Sequelize.BIGINT,
        allowNull: false
      },
      field: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      order: {
        type: we.db.Sequelize.BOOLEAN,
        defaultValue: false
      }
    },
    associations: {
      url: {
        type: 'belongsTo',
        model: 'file-url',
        constraints: false,
        foreignKey: 'urlId'
      }
    },
    options: { paranoid: false }
  };

  return model;
};

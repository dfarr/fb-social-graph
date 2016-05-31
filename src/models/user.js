
///////////////////////////////////////////////////////////////////////////////
// User Model
///////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, Sequelize) {

    return sequelize.define('user', {

        uuid: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, unique: true },

        fbID: { type: Sequelize.STRING, unique: true },

        name: Sequelize.STRING,

        token: Sequelize.STRING

    });

};

var knex = require('knex')({
   client: 'mysql',
   connection: {
      host     : 'localhost',
      user     : 'root',
      password : '',
      database : 'pandorabot',
      charset  : 'UTF8_GENERAL_CI'
   }
});

var DB = require('bookshelf')(knex);

module.exports.DB = DB;
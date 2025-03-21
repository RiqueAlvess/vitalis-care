exports.up = function(knex) {
  return knex.schema.table('api_configurations', function(table) {
    table.string('empresa_padrao');
  });
};

exports.down = function(knex) {
  return knex.schema.table('api_configurations', function(table) {
    table.dropColumn('empresa_padrao');
  });
};

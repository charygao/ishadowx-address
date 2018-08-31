var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var program = require('commander');

function collect(val, memo) {
  memo.push(val);
  return memo;
}

program
.name('ishadowx-address')
.version('1.0.0')
.option('-i, --ishadowx-url <ishadowx-url>', 'ishadowx url')
.option('-g, --gui-config-file <gui-config-file>', 'gui-config.json file path')
.option('-r, --reserved-server [reserved-server]', 'reserved server', collect,
    [])
.parse(process.argv);

var ishadowx_url = program.ishadowxUrl;
var gui_config_file_path = program.guiConfigFile;
var server_whitelist = program.reservedServer;

if (typeof ishadowx_url === 'undefined') {
  console.error('no ishdowx url given!');
  process.exit(1);
}

if (typeof gui_config_file_path === 'undefined') {
  console.error('no gui-config.json file path given!');
  process.exit(1);
}

request(ishadowx_url, function (error, response, body) {
  if (error) {
    console.log('error:', error);
  } else {
    var $ = cheerio.load(body);
    var configs = $('div.portfolio-item').map(function (i, item) {
      var $item = $(item);
      var config = {
        'server': $item.find('[id^=ip]').text(),
        'server_port': parseInt($item.find('[id^=port]').text().trim(), 10),
        'password': $item.find('[id^=pw]').text().trim(),
        'method': $item.find('h4').eq(3).text().substring('Method:'.length)
      }
      return config;
    }).filter(function (i, config) {
      return !!config.server_port
    }).toArray();
    fs.readFile(gui_config_file_path, 'utf8', function (err, data) {
      if (err) {
        console.log(err);
      } else {
        var gui_config = JSON.parse(data);
        gui_config.configs = gui_config.configs.filter(function (config) {
          return server_whitelist.indexOf(config.server) > -1;
        });
        var index = gui_config.configs.length;
        gui_config.configs = gui_config.configs.concat(configs);
        gui_config.index = index;
        var gui_config_content = JSON.stringify(gui_config);
        fs.writeFileSync(gui_config_file_path, gui_config_content)
      }
    });
  }
});

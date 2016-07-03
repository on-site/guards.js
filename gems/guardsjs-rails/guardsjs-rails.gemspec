require "rubygems/package_task"
require File.expand_path("../lib/guardsjs-rails/version", __FILE__)

Gem::Specification.new do |gem|
  gem.name          = "guardsjs-rails"
  gem.version       = GuardsJS::Rails::VERSION
  gem.authors       = ["Mike Virata-Stone"]
  gem.email         = ["mike@virata-stone.com"]
  gem.description   = "This gem wraps the guards.js jQuery validation library as a Rails asset gem."
  gem.summary       = "Rails asset gem for guards.js."
  gem.homepage      = "http://guardsjs.com/"
  gem.license       = "MIT"
  gem.files         = FileList["lib/**/*", "app/**/*"]
  gem.require_paths = ["lib"]
  gem.add_dependency "railties", ">= 3.0", "< 6.0"
end

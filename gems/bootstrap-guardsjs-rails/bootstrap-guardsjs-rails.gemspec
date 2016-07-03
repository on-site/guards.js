require "rubygems/package_task"
require File.expand_path("../lib/bootstrap-guardsjs-rails/version", __FILE__)

Gem::Specification.new do |gem|
  gem.name          = "bootstrap-guardsjs-rails"
  gem.version       = BootstrapGuardsJS::Rails::VERSION
  gem.authors       = ["Mike Virata-Stone"]
  gem.email         = ["mike@virata-stone.com"]
  gem.description   = "This gem depends on the guardsjs-rails gem and adds Bootstrap functionality to make guards.js work well with Bootstrap."
  gem.summary       = "Rails asset gem to integrate guards.js with Bootstrap."
  gem.homepage      = "http://guardsjs.com/"
  gem.license       = "MIT"
  gem.files         = FileList["lib/**/*", "app/**/*"]
  gem.require_paths = ["lib"]
  gem.add_dependency "railties", ">= 3.0", "< 6.0"
  gem.add_dependency "guardsjs-rails", ">= 1.2.0"
end

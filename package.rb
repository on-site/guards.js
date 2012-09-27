#!/usr/bin/ruby
require "rubygems"
require "bundler/setup"
Bundler.require :default

ARGS = $*

if ARGS.length != 1
  puts "usage: package.rb <version>"
  exit
end

version = ARGS[0]
date = %x{ date +"%a %b %_d %H:%M:%S %Y %z" }.strip
year = %x{ date +"%Y" }.strip

header = "/*!
 * Guards JavaScript jQuery Plugin v#{version}
 * http://github.com/on-site/Guards-Javascript-Validation
 *
 * Copyright 2010-#{year}, On-Site.com, http://www.on-site.com/
 * Licensed under the MIT license.
 *
 * Includes code for email and phone number validation from the jQuery
 * Validation plugin.  http://docs.jquery.com/Plugins/Validation
 *
 * Date: #{date}
 */
"

contents = File.read "src/guards.js"
contents.gsub! "{{VERSION}}", version

File.open "guards.js", "w" do |f|
  f << header << "\n" << contents
end

system "cp guards.js guards-#{version}.js"
File.open "guards-#{version}.min.js", "w" do |f|
  f << header
  f << Uglifier.compile(File.read("guards-#{version}.js"), :copyright => false)
end

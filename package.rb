#!/usr/bin/ruby
require "rubygems"
require "bundler/setup"
Bundler.require :default

ARGS = $*
TAG = !!ARGS.delete("--tag")

def die(msg)
  STDERR.puts msg
  exit
end

die "usage: package.rb [--tag] <version>" if ARGS.length != 1

if TAG
  %x[git diff --exit-code]
  die "You have local changes, please commit first." unless $?.exitstatus == 0

  %x[git diff --cached --exit-code]
  die "You have local changes, please commit first." unless $?.exitstatus == 0

  %x[git log --exit-code HEAD ^origin/master]
  die "You have local commits, please push first." unless $?.exitstatus == 0
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

system "git tag -a #{version} -m 'Version #{version}' && git push --tags" if TAG

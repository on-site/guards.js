#!/usr/bin/env ruby

require "erb"
require "fileutils"

OUTPUT_DIR = ARGV.first

def define_pages
  page_group :name => "Repository", :path => "https://github.com/on-site/guards.js"

  page_group :name => "Demo", :path => "index.html" do
    page do
      title "Introduction"
      file "index.html"
    end

    page do
      title "Options"
    end

    page do
      title "Customization"
    end

    page do
      pending!
      title "Grouped Guards"
      file "grouped.html"
    end

    page do
      pending!
      title "Preconditions"
    end

    page do
      pending!
      title "Styling"
    end

    page do
      pending!
      title "Guards and jQuery"
      file "jquery.html"
    end

    page do
      pending!
      title "Playground"
    end
  end

  page_group :name => "Documentation", :path => "documentation.html" do
    page do
      title "Documentation"
      skip_next_and_prev!
    end

    documentation!
  end

  page_group :name => "Downloads", :path => "downloads.html" do
    page do
      title "Downloads"
    end
  end

  page_group :name => "Report Bugs", :path => "https://github.com/on-site/guards.js/issues"
  page_group :name => "jQuery Plugin", :path => "http://plugins.jquery.com/guards/"
end

module Renderable
  def get_binding
    binding
  end

  def render
    ERB.new(template).result get_binding
  end
end

class JsDoc
  include Renderable
  attr_accessor :page, :section, :signature, :since, :content
  attr_reader :doc

  def initialize(doc)
    @doc = doc
    parse!
  end

  def section_id
    @section_id ||= section.gsub(/\W/, "_").gsub(/_+/, "_")
  end

  def content_html
    render
  end

  def template
    JsDoc.template
  end

  private
  def remove_annotation(name)
    value = doc[/^\s*\*\s*@#{Regexp.quote name}\s*(.*?)\s*$/, 1]
    doc.gsub! /^\s*\*\s*@#{Regexp.quote name}\s*(.*?)\s*$/, ""
    value
  end

  def parse!
    self.page = remove_annotation "page"
    self.section = remove_annotation "section"
    self.since = remove_annotation "since"
    self.signature = remove_annotation "signature"
    self.content = doc.gsub(/^\s*\/\*\*\s*^/, "").gsub(/^\s*\*\/\s*/, "").gsub(/^\s*\*/, "")
  end

  class << self
    def template
      @template ||= File.read(Page.input_file("_jsdoc.html.erb"))
    end
  end
end

class DocumentationPage
  include Renderable
  attr_accessor :index
  attr_reader :page_group

  def initialize(page_group)
    @page_group = page_group
  end

  def jsdocs
    @jsdocs ||= []
  end

  def file
    @file ||= (title.downcase.gsub(/\s/, "_").gsub(/\W+/, "_").gsub(/_+/, "_") + ".html")
  end

  def get_file
    file
  end

  def title
    jsdocs.first.page
  end

  def title_html
    "<h1>#{title}</h1>"
  end

  def content_html
    @content_html ||= "".tap do |content|
      content << "<script>$.liveGuard(\".example:not(.not-auto-guarded)\");</script>"
      content << jsdocs.map(&:content_html).join("\n")
    end
  end

  def navigation_html
    page_group.navigation_html
  end

  def prev_html
    ""
  end

  def next_html
    ""
  end

  def wizard_html
    @wizard_html ||= "\n".tap do |wizard|
      wizard << %{<div class="wizard">\n}
      wizard << %{  <ol>\n}

      page_group.pages.each do |page|
        wizard << "    #{page.to_li(page == self)}\n"
      end

      wizard << %{  </ol>\n}
      wizard << %{</div>\n}
    end
  end

  def to_li(current = false)
    css_class = %{ class="current"} if current
    %{<li#{css_class}><a href="#{file}">#{title}</a></li>}
  end

  def output_file
    File.join OUTPUT_DIR, file
  end

  def template
    Page.template
  end

  def generate
    puts "generating '#{get_file}'"

    File.open output_file, "w" do |f|
      f << render
    end
  end

  class << self
    def parse(group)
      guardsjs = File.read(File.expand_path("../../src/guards.js", __FILE__))
      jsdocs = guardsjs.scan(/\/\*\*\s*+\*\s*@page.*?\*\//m).map { |x| JsDoc.new x }
      pages = []
      hash = {}

      jsdocs.each do |doc|
        if hash.include? doc.page
          page = hash[doc.page]
        else
          page = DocumentationPage.new(group)
          pages << page
          hash[doc.page] = page
        end

        page.jsdocs << doc
      end

      pages.each do |page|
        page.index = group.pages.length
        group.pages << page
      end
    end
  end
end

class PageGroup
  attr_reader :name, :path

  def initialize(options)
    @name = options[:name]
    @path = options[:path]
  end

  def documentation!
    DocumentationPage.parse(self)
  end

  def navigation_html
    @navigation_html ||= "\n".tap do |nav|
      nav << %{<ul>\n}

      PAGE_GROUPS.each do |group|
        nav << "  #{group.to_li(group == self)}\n"
      end

      nav << %{</ul>\n}
    end
  end

  def to_li(current = false)
    css_class = %{ class="current"} if current
    %{<li#{css_class}><a class="transition-background" href="#{path}">#{name}</a></li>}
  end

  def pages
    @pages ||= []
  end

  def page(&block)
    p = Page.new self
    p.index pages.length
    p.instance_eval &block
    pages << p unless p.pending?
  end

  def pending!
    @pending = true
  end

  def pending?
    @pending
  end

  def generate
    pages.each &:generate
  end
end

class Page
  include Renderable
  attr_reader :page_group

  def initialize(page_group)
    @page_group = page_group
  end

  def index(value)
    @index = value
  end

  def title(value)
    @title = value
  end

  def file(value)
    @file = value
  end

  def get_index
    @index
  end

  def get_title
    @title
  end

  def get_file
    @file || "#{get_title.downcase}.html"
  end

  def pending!
    @pending = true
  end

  def pending?
    @pending
  end

  def output_file
    File.join OUTPUT_DIR, get_file
  end

  def template
    Page.template
  end

  def generate
    puts "generating '#{get_file}'"

    File.open output_file, "w" do |f|
      f << render
    end
  end

  def title_html
    @title_html ||= %{<h1>#{get_title}</h1>}
  end

  def content_html
    @content_html ||= File.read(Page.input_file("#{get_file}.erb"))
  end

  def navigation_html
    page_group.navigation_html
  end

  def wizard_disabled?
    page_group.pages.length <= 1
  end

  def wizard_html
    return "" if wizard_disabled?

    @wizard_html ||= "\n".tap do |wizard|
      wizard << %{<div class="wizard">\n}
      wizard << %{  <ol>\n}

      page_group.pages.each do |page|
        wizard << "    #{page.to_li(page == self)}\n"
      end

      wizard << %{  </ol>\n}
      wizard << %{</div>\n}
    end
  end

  def skip_next_and_prev!
    @skip_next_and_prev = true
  end

  def prev_html
    return "" if @skip_next_and_prev
    @prev_html ||= if get_index > 0
                     %{<a href="#{page_group.pages[get_index - 1].get_file}">previous</a>}
                   else
                     ""
                   end
  end

  def next_html
    return "" if @skip_next_and_prev
    @next_html ||= if get_index < page_group.pages.length - 1
                     %{<a href="#{page_group.pages[get_index + 1].get_file}">next</a>}
                   else
                     ""
                   end
  end

  def to_li(current = false)
    css_class = %{ class="current"} if current
    %{<li#{css_class}><a href="#{get_file}">#{get_title}</a></li>}
  end

  class << self
    def input_file(name)
      File.expand_path("../#{name}", __FILE__)
    end

    def template
      @template ||= File.read(input_file("_template.html.erb"))
    end
  end
end

PAGE_GROUPS = []

def page_group(options, &block)
  group = PageGroup.new options
  group.instance_eval &block if block
  PAGE_GROUPS << group unless group.pending?
end

def check_usage
  if ARGV.length != 1
    puts "usage: ./generate.rb <output-directory>"
    exit 1
  end
end

def copy(dirname)
  path = File.expand_path "../#{dirname}", __FILE__
  return unless File.directory? path

  Dir.foreach path do |file|
    file_path = File.join path, file
    next unless File.file? file_path
    next if file =~ /~$/
    output_dir = File.join OUTPUT_DIR, dirname
    FileUtils.mkdir output_dir unless File.directory? output_dir
    output_file = File.join output_dir, file
    contents = File.read file_path

    File.open output_file, "w" do |f|
      f << contents
    end
  end
end

def generate
  FileUtils.mkdir OUTPUT_DIR unless File.directory? OUTPUT_DIR
  PAGE_GROUPS.each &:generate
  copy "stylesheets"
  copy "javascripts"
  copy "images"
end

define_pages
check_usage
generate

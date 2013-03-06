#!/usr/bin/env ruby

require "fileutils"

OUTPUT_DIR = ARGV.first

def define_pages
  page_group :name => "Repository", :path => "https://github.com/on-site/guards.js"

  page_group :name => "Demo", :path => "/" do
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

  page_group :name => "Documentation", :path => "https://github.com/on-site/guards.js#summary"
  page_group :name => "Downloads", :path => "https://github.com/on-site/guards.js#downloads"
  page_group :name => "Report Bugs", :path => "https://github.com/on-site/guards.js/issues"
  page_group :name => "jQuery Plugin", :path => "http://plugins.jquery.com/guards/"
end

class PageGroup
  attr_reader :name, :path

  def initialize(options)
    @name = options[:name]
    @path = options[:path]
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
    current_class = " current" if current
    %{<li><a class="transition-background#{current_class}" href="#{path}">#{name}</a></li>}
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

  def generate
    puts "generating '#{get_file}'"
    result = Page.template.clone
    result.gsub! "{{title}}", title_html
    result.gsub! "{{content}}", content_html
    result.gsub! "{{wizard}}", wizard_html
    result.gsub! "{{navigation}}", page_group.navigation_html
    result.gsub! "{{prev}}", prev_html
    result.gsub! "{{next}}", next_html

    File.open output_file, "w" do |f|
      f << result
    end
  end

  def title_html
    @title_html ||= %{<h1>#{get_title}</h1>}
  end

  def content_html
    @content_html ||= File.read(Page.input_file("_#{get_file}"))
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

  def prev_html
    @prev_html ||= if get_index > 0
                     %{<a href="#{page_group.pages[get_index - 1].get_file}">previous</a>}
                   else
                     ""
                   end
  end

  def next_html
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
      @template ||= File.read(input_file("_template.html"))
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

#!/usr/bin/env ruby

require "fileutils"

OUTPUT_DIR = ARGV.first

def define_pages
  page do
    step "Introduction"
    file "index.html"
  end

  page do
    step "Options"
  end

  page do
    step "Customization"
  end

  page do
    pending!
    step "Grouped Guards"
    file "grouped.html"
  end

  page do
    pending!
    step "Preconditions"
  end

  page do
    pending!
    step "Styling"
  end

  page do
    pending!
    step "Guards and jQuery"
    file "jquery.html"
  end

  page do
    pending!
    step "Playground"
  end
end

class Page
  def index(value)
    @index = value
  end

  def step(value)
    @step = value
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

  def get_step
    @step
  end

  def get_title
    @title || get_step
  end

  def get_file
    @file || "#{get_step.downcase}.html"
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
    result = Page.template.clone
    result.gsub! "{{title}}", title_html
    result.gsub! "{{content}}", content_html
    result.gsub! "{{wizard}}", wizard_html
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

  def wizard_html
    @wizard_html ||= "\n".tap do |wizard|
      wizard << %{<div class="wizard">\n}
      wizard << %{  <ol>\n}

      PAGES.each do |page|
        wizard << "    #{page.to_li(page == self)}\n"
      end

      wizard << %{  </ol>\n}
      wizard << %{</div>\n}
    end
  end

  def prev_html
    @prev_html ||= if get_index > 0
                     %{<a href="#{PAGES[get_index - 1].get_file}">previous</a>}
                   else
                     ""
                   end
  end

  def next_html
    @next_html ||= if get_index < PAGES.length - 1
                     %{<a href="#{PAGES[get_index + 1].get_file}">next</a>}
                   else
                     ""
                   end
  end

  def to_li(current = false)
    css_class = %{ class="current"} if current
    %{<li#{css_class}><a href="#{get_file}">#{get_step}</a></li>}
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

PAGES = []

def page(&block)
  p = Page.new
  p.index PAGES.length
  p.instance_eval &block
  PAGES << p unless p.pending?
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
    output_file = File.join OUTPUT_DIR, dirname, file
    contents = File.read file_path

    File.open output_file, "w" do |f|
      f << contents
    end
  end
end

def generate
  FileUtils.mkdir OUTPUT_DIR unless File.directory? OUTPUT_DIR
  PAGES.each &:generate
  copy "stylesheets"
  copy "javascripts"
  copy "images"
end

define_pages
check_usage
generate

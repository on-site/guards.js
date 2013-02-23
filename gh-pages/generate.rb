#!/usr/bin/env ruby

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
    step "Preconditions"
  end

  page do
    step "Styling"
  end

  page do
    step "Playground"
  end
end

class Page
  def step(value)
    @step = value
  end

  def title(value)
    @title = value
  end

  def file(value)
    @file = value
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

  def output_file
    File.join Page.output_dir, get_file
  end

  def generate(index)
    result = Page.template.clone
    result.gsub! "{{content}}", content

    if index > 0
      prev_html = %{<a href="#{PAGES[index - 1].get_file}">previous</a>}
    end

    if index < PAGES.length - 1
      next_html = %{<a href="#{PAGES[index + 1].get_file}">next</a>}
    end

    result.gsub! "{{title}}", %{<h1>#{get_title}</h1>}
    result.gsub! "{{prev}}", prev_html.to_s
    result.gsub! "{{next}}", next_html.to_s

    File.open output_file, "w" do |f|
      f << result
    end
  end

  def content
    @content ||= File.read(Page.input_file("_#{get_file}"))
  end

  def to_li
    %{<li><a href="#{get_file}">#{get_step}</a></li>}
  end

  class << self
    def output_dir
      ARGV.first
    end

    def input_file(name)
      File.expand_path("../#{name}", __FILE__)
    end

    def template
      @template ||= File.read(input_file("_template.html")).gsub("{{wizard}}", wizard)
    end

    def wizard
      @wizard ||= %{
      <p class="wizard">
        <ol>
          #{PAGES.map(&:to_li).join "\n    "}
        </ol>
      </p>}
    end
  end
end

PAGES = []

def page(&block)
  PAGES << Page.new.tap do |p|
    p.instance_eval &block
  end
end

def check_usage
  if ARGV.length != 1
    puts "usage: ./generate.rb <output-directory>"
    exit 1
  end
end

def generate
  PAGES.each_with_index do |p, i|
    p.generate i
  end
end

define_pages
check_usage
generate

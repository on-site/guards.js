# Nginxtra is used to host the directory as a web server so the tests
# can be run with coverage enabled (coverage tests won't work when the
# tests are loaded as a file:/// file).

nginxtra.config do
  file "nginx.conf" do
    worker_processes 1

    events do
      worker_connections 32
    end

    http do
      server do
        listen 8080
        server_name "localhost"
        root File.expand_path("..",  __FILE__)
      end
    end
  end
end

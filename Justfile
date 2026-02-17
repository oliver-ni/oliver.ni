serve:
    #!/bin/sh
    zola serve &
    tailwindcss -i ./static/input.css -o ./static/style.css --watch
    kill "$!"

build *FLAGS:
    tailwindcss -i ./static/input.css -o ./static/style.css
    zola build {{FLAGS}}

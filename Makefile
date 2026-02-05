BANNER = src/banner.js
FOOTER = src/footer.js

INTERNAL = \
  src/errors.js \
  src/token.js \
  src/lexer.js \
  src/parser.js \
  src/path.js \
  src/api.js

DIST = dist/jsonpath.js

all: $(DIST)

build: $(DIST)

$(DIST): $(BANNER) $(INTERNAL) $(FOOTER)
	@mkdir -p dist
	@echo "Building $(DIST)"

	@cat $(BANNER) > $(DIST)

	@for f in $(INTERNAL); do \
	  sed '/^$$/!s/^/  /' $$f >> $(DIST); \
	  echo >> $(DIST); \
	done

	@cat $(FOOTER) >> $(DIST)

clean:
	rm -f $(DIST)

rebuild: clean build

test: rebuild
	bun test

dev: rebuild
	bun run dev.mjs
	
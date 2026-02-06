BANNER = src/banner.js
FOOTER = src/footer.js

INTERNAL = \
  src/errors.js \
  src/utils.js \
  src/token.js \
  src/lex.js \
  src/parse.js \
  src/resolve.js \
  src/functions.js \
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
	
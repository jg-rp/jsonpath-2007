BANNER = src/banner.js
FOOTER = src/footer.js
EXPORT = src/export.js

INTERNAL = \
  src/errors.js \
  src/utils.js \
  src/lru_cache.js \
  src/token.js \
  src/lex.js \
  src/parse.js \
  src/resolve.js \
  src/functions.js \
  src/api.js

DIST = dist
GLOBAL = $(DIST)/jsonpath-2007.global.js
CJS = $(DIST)/jsonpath-2007.cjs.js

all: $(GLOBAL) $(CJS)

$(DIST):
	mkdir -p $(DIST)

$(GLOBAL): ${DIST} $(BANNER) $(INTERNAL) $(FOOTER)
	@echo "Building $(GLOBAL)"
	@cat $(BANNER) > $(GLOBAL)

	@for f in $(INTERNAL); do \
	  sed '/^$$/!s/^/  /' $$f >> $(GLOBAL); \
	  echo >> $(GLOBAL); \
	done

	@cat $(FOOTER) >> $(GLOBAL)

$(CJS): ${DIST} $(BANNER) $(INTERNAL) $(FOOTER)
	@echo "Building $(CJS)"
	@cat $(BANNER) > $(CJS)

	@for f in $(INTERNAL); do \
	  sed '/^$$/!s/^/  /' $$f >> $(CJS); \
	  echo >> $(CJS); \
	done

	@cat $(FOOTER) >> $(CJS)
	@cat $(EXPORT) >> $(CJS)

clean:
	rm -f $(GLOBAL) ${CJS}

build: $(GLOBAL) $(CJS)

rebuild: clean build

test: rebuild
	bun test

dev: rebuild
	bun run dev.mjs

.PHONY: all build rebuild clean test dev

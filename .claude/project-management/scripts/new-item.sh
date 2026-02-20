#!/bin/bash

# FoodBot - Create New Documentation Item
# Usage: ./new-item.sh [task|requirement|architecture] [name]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_DIR="$PROJECT_ROOT/templates"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [task|requirement|architecture] [name]"
    echo ""
    echo "Examples:"
    echo "  $0 task implement-oauth-flow"
    echo "  $0 requirement customer-search"
    echo "  $0 architecture mcp-integration"
    exit 1
}

if [ "$#" -lt 2 ]; then
    usage
fi

TYPE="$1"
NAME="$2"
CURRENT_DATE=$(date '+%Y-%m-%d')

case "$TYPE" in
    task)
        # Get next task number
        LAST_TASK=$(find "$PROJECT_ROOT/tasks" -name "TASK-*.md" 2>/dev/null | sed 's/.*TASK-\([0-9]*\).*/\1/' | sort -n | tail -1)
        if [ -z "$LAST_TASK" ]; then
            TASK_NUM="001"
        else
            TASK_NUM=$(printf "%03d" $((10#$LAST_TASK + 1)))
        fi

        FILE_NAME="TASK-${TASK_NUM}-${NAME}.md"
        OUTPUT_DIR="$PROJECT_ROOT/tasks/pending"
        TEMPLATE="$TEMPLATES_DIR/task-template.md"

        mkdir -p "$OUTPUT_DIR"

        # Copy template and customize
        cp "$TEMPLATE" "$OUTPUT_DIR/$FILE_NAME"

        # Replace placeholders
        sed -i.bak "s/TASK-\[NUMBER\]/TASK-$TASK_NUM/g" "$OUTPUT_DIR/$FILE_NAME"
        sed -i.bak "s/\[Task Title\]/$(echo $NAME | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')/g" "$OUTPUT_DIR/$FILE_NAME"
        sed -i.bak "s/YYYY-MM-DD/$CURRENT_DATE/g" "$OUTPUT_DIR/$FILE_NAME"
        rm "$OUTPUT_DIR/$FILE_NAME.bak"

        echo -e "${GREEN}✅ Task created:${NC} $OUTPUT_DIR/$FILE_NAME"
        echo -e "${YELLOW}📝 Edit the file to fill in details:${NC}"
        echo -e "   code $OUTPUT_DIR/$FILE_NAME"
        ;;

    requirement)
        # Prompt for component
        echo "Select component:"
        echo "  1) customer-agent"
        echo "  2) restaurant-agent"
        echo "  3) mcp-layer"
        echo "  4) llm"
        echo "  5) workflows"
        echo "  6) chrome-extension"
        echo "  7) mobile-app"
        read -p "Choice (1-7): " component_choice

        case $component_choice in
            1) COMPONENT="customer-agent"; COMP_SHORT="CA" ;;
            2) COMPONENT="restaurant-agent"; COMP_SHORT="RA" ;;
            3) COMPONENT="mcp-layer"; COMP_SHORT="MCP" ;;
            4) COMPONENT="llm"; COMP_SHORT="LLM" ;;
            5) COMPONENT="workflows"; COMP_SHORT="WF" ;;
            6) COMPONENT="chrome-extension"; COMP_SHORT="EXT" ;;
            7) COMPONENT="mobile-app"; COMP_SHORT="MOBILE" ;;
            *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
        esac

        # Get next requirement number for this component
        LAST_REQ=$(find "$PROJECT_ROOT/requirements/$COMPONENT" -name "FR-*.md" 2>/dev/null | \
                   grep -o "FR-$COMP_SHORT-[^-]*-[0-9]*" | \
                   grep -o "[0-9]*$" | \
                   sort -n | tail -1)

        if [ -z "$LAST_REQ" ]; then
            REQ_NUM="001"
        else
            REQ_NUM=$(printf "%03d" $((10#$LAST_REQ + 1)))
        fi

        # Prompt for category
        read -p "Category (e.g., UI, SEARCH, API): " CATEGORY
        CATEGORY=$(echo "$CATEGORY" | tr '[:lower:]' '[:upper:]')

        REQ_ID="FR-${COMP_SHORT}-${CATEGORY}-${REQ_NUM}"
        FILE_NAME="${REQ_ID}-${NAME}.md"
        OUTPUT_DIR="$PROJECT_ROOT/requirements/$COMPONENT"
        TEMPLATE="$TEMPLATES_DIR/requirement-template.md"

        mkdir -p "$OUTPUT_DIR"

        # Copy template and customize
        cp "$TEMPLATE" "$OUTPUT_DIR/$FILE_NAME"

        # Replace placeholders
        sed -i.bak "s/FR-\[COMPONENT\]-\[CATEGORY\]-\[NUMBER\]/$REQ_ID/g" "$OUTPUT_DIR/$FILE_NAME"
        sed -i.bak "s/\[Component Name\]/$(echo $NAME | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')/g" "$OUTPUT_DIR/$FILE_NAME"
        sed -i.bak "s/YYYY-MM-DD/$CURRENT_DATE/g" "$OUTPUT_DIR/$FILE_NAME"
        rm "$OUTPUT_DIR/$FILE_NAME.bak"

        echo -e "${GREEN}✅ Requirement created:${NC} $OUTPUT_DIR/$FILE_NAME"
        echo -e "${YELLOW}📝 Edit the file to fill in details:${NC}"
        echo -e "   code $OUTPUT_DIR/$FILE_NAME"
        ;;

    architecture)
        # Prompt for type
        echo "Select architecture type:"
        echo "  1) components"
        echo "  2) data"
        echo "  3) integration"
        echo "  4) security"
        echo "  5) deployment"
        read -p "Choice (1-5): " arch_choice

        case $arch_choice in
            1) ARCH_TYPE="components" ;;
            2) ARCH_TYPE="data" ;;
            3) ARCH_TYPE="integration" ;;
            4) ARCH_TYPE="security" ;;
            5) ARCH_TYPE="deployment" ;;
            *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
        esac

        FILE_NAME="${NAME}.md"
        OUTPUT_DIR="$PROJECT_ROOT/architecture/$ARCH_TYPE"
        TEMPLATE="$TEMPLATES_DIR/architecture-template.md"

        mkdir -p "$OUTPUT_DIR"

        # Copy template and customize
        cp "$TEMPLATE" "$OUTPUT_DIR/$FILE_NAME"

        # Replace placeholders
        sed -i.bak "s/\[Component\/System Name\]/$(echo $NAME | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')/g" "$OUTPUT_DIR/$FILE_NAME"
        sed -i.bak "s/YYYY-MM-DD/$CURRENT_DATE/g" "$OUTPUT_DIR/$FILE_NAME"
        rm "$OUTPUT_DIR/$FILE_NAME.bak"

        echo -e "${GREEN}✅ Architecture document created:${NC} $OUTPUT_DIR/$FILE_NAME"
        echo -e "${YELLOW}📝 Edit the file to fill in details:${NC}"
        echo -e "   code $OUTPUT_DIR/$FILE_NAME"
        ;;

    *)
        echo -e "${RED}Unknown type: $TYPE${NC}"
        usage
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC} Don't forget to:"
echo "  1. Fill in all sections of the document"
echo "  2. Run './scripts/generate-task-list.sh' to update task lists"
echo "  3. Commit your changes to git"
echo ""

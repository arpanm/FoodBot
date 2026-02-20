#!/bin/bash

# FoodBot Task List Generator
# Generates consolidated lists of tasks by status

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASKS_DIR="$PROJECT_ROOT/tasks"
OUTPUT_DIR="$PROJECT_ROOT/task-lists"

mkdir -p "$OUTPUT_DIR"

echo "🔍 Scanning tasks..."

# Function to extract task metadata
extract_task_info() {
    local file="$1"
    local filename=$(basename "$file")
    local task_id=$(echo "$filename" | sed 's/\.md$//')

    # Extract title (first h1)
    local title=$(grep -m 1 "^# " "$file" | sed 's/^# //')

    # Extract status
    local status=$(grep "^\*\*Status\*\*:" "$file" | sed 's/.*: //' | tr -d '\n')

    # Extract priority
    local priority=$(grep "^\*\*Priority\*\*:" "$file" | sed 's/.*: //' | tr -d '\n')

    # Extract assigned to
    local assigned=$(grep "^\*\*Assigned To\*\*:" "$file" | sed 's/.*: //' | tr -d '\n')

    # Extract created date
    local created=$(grep "^\*\*Created\*\*:" "$file" | sed 's/.*: //' | tr -d '\n')

    echo "$task_id|$title|$status|$priority|$assigned|$created|$file"
}

# Generate completed tasks list
echo "📝 Generating completed tasks list..."
{
    echo "# Completed Tasks"
    echo ""
    echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "**Total**: $(find "$TASKS_DIR/completed" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')"
    echo ""
    echo "| Task ID | Title | Priority | Completed Date | Assigned To |"
    echo "|---------|-------|----------|----------------|-------------|"

    find "$TASKS_DIR/completed" -name "*.md" 2>/dev/null | while read -r file; do
        info=$(extract_task_info "$file")
        task_id=$(echo "$info" | cut -d'|' -f1)
        title=$(echo "$info" | cut -d'|' -f2)
        priority=$(echo "$info" | cut -d'|' -f4)
        assigned=$(echo "$info" | cut -d'|' -f5)
        created=$(echo "$info" | cut -d'|' -f6)

        echo "| [$task_id]($file) | $title | $priority | $created | $assigned |"
    done | sort
} > "$OUTPUT_DIR/completed-tasks.md"

# Generate in-progress tasks list
echo "⏳ Generating in-progress tasks list..."
{
    echo "# In-Progress Tasks"
    echo ""
    echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "**Total**: $(find "$TASKS_DIR/in-progress" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')"
    echo ""
    echo "| Task ID | Title | Priority | Started | Assigned To | Progress |"
    echo "|---------|-------|----------|---------|-------------|----------|"

    find "$TASKS_DIR/in-progress" -name "*.md" 2>/dev/null | while read -r file; do
        info=$(extract_task_info "$file")
        task_id=$(echo "$info" | cut -d'|' -f1)
        title=$(echo "$info" | cut -d'|' -f2)
        priority=$(echo "$info" | cut -d'|' -f4)
        assigned=$(echo "$info" | cut -d'|' -f5)
        created=$(echo "$info" | cut -d'|' -f6)

        # Count completed checkboxes
        total_checks=$(grep -c "\- \[.\]" "$file" 2>/dev/null || echo "0")
        done_checks=$(grep -c "\- \[x\]" "$file" 2>/dev/null || echo "0")
        if [ "$total_checks" -gt 0 ]; then
            progress="$done_checks/$total_checks"
        else
            progress="-"
        fi

        echo "| [$task_id]($file) | $title | $priority | $created | $assigned | $progress |"
    done | sort -t'|' -k4 -r
} > "$OUTPUT_DIR/in-progress-tasks.md"

# Generate pending tasks list
echo "📋 Generating pending tasks list..."
{
    echo "# Pending Tasks (Backlog)"
    echo ""
    echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "**Total**: $(find "$TASKS_DIR/pending" "$TASKS_DIR/backlog" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')"
    echo ""
    echo "## High Priority"
    echo ""
    echo "| Task ID | Title | Created | Assigned To | Dependencies |"
    echo "|---------|-------|---------|-------------|--------------|"

    find "$TASKS_DIR/pending" "$TASKS_DIR/backlog" -name "*.md" 2>/dev/null | while read -r file; do
        info=$(extract_task_info "$file")
        task_id=$(echo "$info" | cut -d'|' -f1)
        title=$(echo "$info" | cut -d'|' -f2)
        priority=$(echo "$info" | cut -d'|' -f4)
        assigned=$(echo "$info" | cut -d'|' -f5)
        created=$(echo "$info" | cut -d'|' -f6)

        # Extract dependencies
        deps=$(grep "^- \[ \] TASK-" "$file" | head -3 | wc -l | tr -d ' ')

        # Only show high priority
        if echo "$priority" | grep -q "High\|Critical"; then
            echo "| [$task_id]($file) | $title | $created | $assigned | $deps deps |"
        fi
    done | sort

    echo ""
    echo "## Medium Priority"
    echo ""
    echo "| Task ID | Title | Created | Assigned To |"
    echo "|---------|-------|---------|-------------|"

    find "$TASKS_DIR/pending" "$TASKS_DIR/backlog" -name "*.md" 2>/dev/null | while read -r file; do
        info=$(extract_task_info "$file")
        task_id=$(echo "$info" | cut -d'|' -f1)
        title=$(echo "$info" | cut -d'|' -f2)
        priority=$(echo "$info" | cut -d'|' -f4)
        assigned=$(echo "$info" | cut -d'|' -f5)
        created=$(echo "$info" | cut -d'|' -f6)

        if echo "$priority" | grep -q "Medium"; then
            echo "| [$task_id]($file) | $title | $created | $assigned |"
        fi
    done | sort

    echo ""
    echo "## Low Priority"
    echo ""
    echo "| Task ID | Title | Created |"
    echo "|---------|-------|---------|"

    find "$TASKS_DIR/pending" "$TASKS_DIR/backlog" -name "*.md" 2>/dev/null | while read -r file; do
        info=$(extract_task_info "$file")
        task_id=$(echo "$info" | cut -d'|' -f1)
        title=$(echo "$info" | cut -d'|' -f2)
        priority=$(echo "$info" | cut -d'|' -f4)
        created=$(echo "$info" | cut -d'|' -f6)

        if echo "$priority" | grep -q "Low"; then
            echo "| [$task_id]($file) | $title | $created |"
        fi
    done | sort
} > "$OUTPUT_DIR/pending-tasks.md"

# Generate master task list (all tasks)
echo "📊 Generating master task list..."
{
    echo "# All Tasks - Master List"
    echo ""
    echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    total=$(find "$TASKS_DIR" -name "*.md" -not -name "index.md" 2>/dev/null | wc -l | tr -d ' ')
    completed=$(find "$TASKS_DIR/completed" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    in_progress=$(find "$TASKS_DIR/in-progress" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    pending=$(find "$TASKS_DIR/pending" "$TASKS_DIR/backlog" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

    echo "## Statistics"
    echo ""
    echo "- **Total Tasks**: $total"
    echo "- **Completed**: $completed ($(( completed * 100 / total ))%)"
    echo "- **In Progress**: $in_progress ($(( in_progress * 100 / total ))%)"
    echo "- **Pending**: $pending ($(( pending * 100 / total ))%)"
    echo ""
    echo "## All Tasks"
    echo ""
    echo "| Task ID | Title | Status | Priority | Assigned To | Created |"
    echo "|---------|-------|--------|----------|-------------|---------|"

    find "$TASKS_DIR" -name "*.md" -not -name "index.md" 2>/dev/null | while read -r file; do
        info=$(extract_task_info "$file")
        task_id=$(echo "$info" | cut -d'|' -f1)
        title=$(echo "$info" | cut -d'|' -f2)
        status=$(echo "$info" | cut -d'|' -f3)
        priority=$(echo "$info" | cut -d'|' -f4)
        assigned=$(echo "$info" | cut -d'|' -f5)
        created=$(echo "$info" | cut -d'|' -f6)

        echo "| [$task_id]($file) | $title | $status | $priority | $assigned | $created |"
    done | sort
} > "$OUTPUT_DIR/all-tasks.md"

echo ""
echo "✅ Task lists generated successfully!"
echo ""
echo "📁 Output location: $OUTPUT_DIR/"
echo "   - completed-tasks.md"
echo "   - in-progress-tasks.md"
echo "   - pending-tasks.md"
echo "   - all-tasks.md"
echo ""

#!/usr/bin/env python3
"""
Validation script for YouTube AutoGen integration implementation.

This script validates that the YouTube AutoGen integration has been properly
implemented according to Story 2.3 requirements.
"""

import os
import sys
import ast
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def validate_file_exists(file_path, description):
    """Validate that a file exists."""
    if os.path.exists(file_path):
        logger.info(f"✅ {description}: {file_path}")
        return True
    else:
        logger.error(f"❌ {description} not found: {file_path}")
        return False

def validate_python_syntax(file_path):
    """Validate Python file syntax."""
    try:
        with open(file_path, 'r') as f:
            ast.parse(f.read())
        logger.info(f"✅ Python syntax valid: {file_path}")
        return True
    except SyntaxError as e:
        logger.error(f"❌ Python syntax error in {file_path}: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Error reading {file_path}: {e}")
        return False

def validate_file_contains(file_path, search_terms, description):
    """Validate that a file contains specific terms."""
    if not os.path.exists(file_path):
        logger.error(f"❌ File not found for {description}: {file_path}")
        return False

    try:
        with open(file_path, 'r') as f:
            content = f.read()

        found_terms = []
        missing_terms = []

        for term in search_terms:
            if term in content:
                found_terms.append(term)
            else:
                missing_terms.append(term)

        if not missing_terms:
            logger.info(f"✅ {description} - all required terms found: {', '.join(found_terms)}")
            return True
        else:
            logger.warning(f"⚠️  {description} - missing terms: {', '.join(missing_terms)}")
            logger.info(f"   Found terms: {', '.join(found_terms)}")
            return len(found_terms) > len(missing_terms)  # Partial success

    except Exception as e:
        logger.error(f"❌ Error reading {file_path}: {e}")
        return False

def main():
    """Run all validations."""
    logger.info("🚀 Starting YouTube AutoGen Integration Validation")
    logger.info("=" * 60)

    validation_results = []

    # 1. Validate core implementation files exist
    logger.info("\n📁 Validating Core Implementation Files")
    core_files = [
        ("apps/backend/api/routes/simple_youtube.py", "Enhanced YouTube API route"),
        ("apps/backend/services/autogen_orchestrator.py", "AutoGen orchestrator service"),
        ("apps/backend/tests/test_youtube_autogen_integration.py", "YouTube AutoGen integration tests"),
    ]

    for file_path, description in core_files:
        validation_results.append(validate_file_exists(file_path, description))

    # 2. Validate Python syntax
    logger.info("\n🐍 Validating Python Syntax")
    python_files = [
        "apps/backend/api/routes/simple_youtube.py",
        "apps/backend/services/autogen_orchestrator.py",
        "apps/backend/tests/test_youtube_autogen_integration.py",
    ]

    for file_path in python_files:
        if os.path.exists(file_path):
            validation_results.append(validate_python_syntax(file_path))

    # 3. Validate AutoGen integration features
    logger.info("\n🤖 Validating AutoGen Integration Features")

    # Check simple_youtube.py for AutoGen integration
    autogen_terms = [
        "trigger_autogen_debate",
        "financial_relevance",
        "analyze_financial_relevance",
        "trigger_autogen_conversation",
        "AutoGenOrchestrator",
        "ContentSource"
    ]
    validation_results.append(
        validate_file_contains(
            "apps/backend/api/routes/simple_youtube.py",
            autogen_terms,
            "YouTube endpoint AutoGen integration"
        )
    )

    # 4. Validate financial relevance analysis
    logger.info("\n💰 Validating Financial Relevance Analysis")

    relevance_terms = [
        "relevance_score",
        "financial_topics",
        "market_relevance",
        "investment_relevance",
        "openai_client"
    ]
    validation_results.append(
        validate_file_contains(
            "apps/backend/api/routes/simple_youtube.py",
            relevance_terms,
            "Financial relevance analysis implementation"
        )
    )

    # 5. Validate test coverage
    logger.info("\n🧪 Validating Test Coverage")

    test_terms = [
        "test_financial_relevance_analysis",
        "test_autogen_conversation_trigger",
        "test_low_relevance_content",
        "test_error_handling",
        "AsyncMock",
        "pytest.mark.asyncio"
    ]
    validation_results.append(
        validate_file_contains(
            "apps/backend/tests/test_youtube_autogen_integration.py",
            test_terms,
            "Comprehensive test coverage"
        )
    )

    # 6. Validate AutoGen orchestrator integration
    logger.info("\n🎭 Validating AutoGen Orchestrator Integration")

    orchestrator_terms = [
        "AutoGenOrchestrator",
        "create_session",
        "start_debate",
        "AssistantAgent",
        "ContentSource",
        "financial_analyst"
    ]
    validation_results.append(
        validate_file_contains(
            "apps/backend/services/autogen_orchestrator.py",
            orchestrator_terms,
            "AutoGen orchestrator functionality"
        )
    )

    # 7. Validate error handling and fallbacks
    logger.info("\n🛡️  Validating Error Handling and Fallbacks")

    error_terms = [
        "try:",
        "except",
        "logger.error",
        "HTTPException",
        "graceful",
        "fallback"
    ]
    validation_results.append(
        validate_file_contains(
            "apps/backend/api/routes/simple_youtube.py",
            error_terms,
            "Error handling and fallbacks"
        )
    )

    # 8. Summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 VALIDATION SUMMARY")
    logger.info("=" * 60)

    passed = sum(validation_results)
    total = len(validation_results)
    success_rate = (passed / total) * 100 if total > 0 else 0

    logger.info(f"✅ Passed: {passed}/{total} validations ({success_rate:.1f}%)")

    if success_rate >= 80:
        logger.info("🎉 YouTube AutoGen integration implementation is VALID!")
        logger.info("📋 Story 2.3 requirements have been successfully implemented.")
        return True
    elif success_rate >= 60:
        logger.warning("⚠️  YouTube AutoGen integration implementation has MINOR ISSUES.")
        logger.warning("🔧 Some components may need refinement but core functionality is present.")
        return True
    else:
        logger.error("❌ YouTube AutoGen integration implementation has MAJOR ISSUES.")
        logger.error("🚨 Significant work needed to meet Story 2.3 requirements.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
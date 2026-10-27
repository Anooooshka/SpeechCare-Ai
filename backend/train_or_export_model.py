#!/usr/bin/env python3
"""
SpeechCare AI — Model Training and Checkpoint Export Tool.

Trains and validates SpeechCareFusionNet on the patient-partitioned TORGO/UASpeech
benchmark dataset, computes macro-F1, sensitivity, specificity, and confusion matrix,
and exports trained weights to backend/weights/speechcare_fusion_model.pt.

To run:
    backend_venv/bin/python backend/train_or_export_model.py --train
"""

import os
import sys
import argparse

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.model_training_evaluation import ModelTrainingAndEvaluator

def main():
    parser = argparse.ArgumentParser(description="SpeechCare AI Benchmark Trainer & Exporter")
    parser.add_argument("--train", action="store_true", help="Run full benchmark training and evaluation")
    parser.add_argument("--export-starter", action="store_true", help="Ensure weights and evaluation metrics exist")
    parser.add_argument("--epochs", type=int, default=20, help="Number of training epochs")
    args = parser.parse_args()

    print("[*] Launching SpeechCare AI Benchmark Training & Evaluation...")
    report = ModelTrainingAndEvaluator.train_and_evaluate_benchmark(epochs=args.epochs)
    
    print("\n=================== BENCHMARK EVALUATION RESULTS ===================")
    print(f"Architecture:      {report['model_architecture']}")
    print(f"Dataset:           {report['benchmark_dataset']}")
    print(f"Overall Accuracy:  {report['evaluation_metrics']['overall_accuracy_percent']}%")
    print(f"Macro-F1 Score:    {report['evaluation_metrics']['macro_f1_percent']}%")
    print(f"Macro-Sensitivity: {report['evaluation_metrics']['macro_sensitivity_recall_percent']}%")
    print(f"Macro-Specificity: {report['evaluation_metrics']['macro_specificity_percent']}%")
    print("\nConfusion Matrix (Rows=True, Cols=Pred: Control, Mild, Moderate, Severe):")
    for row in report['evaluation_metrics']['confusion_matrix']:
        print(" ", row)
    print("====================================================================")
    print(f"[✓] Checkpoint saved to: {ModelTrainingAndEvaluator.WEIGHTS_FILE}")
    print(f"[✓] Metrics saved to:    {ModelTrainingAndEvaluator.METRICS_FILE}")

if __name__ == "__main__":
    main()

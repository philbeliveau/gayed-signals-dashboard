"""
Chart Generator

Generates interactive and static charts for Gayed signal analysis and market data visualization.
"""

import os
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
import structlog

from ..utils.logger import LoggerMixin

logger = structlog.get_logger(__name__)


class ChartGenerator(LoggerMixin):
    """
    Generates comprehensive charts for Gayed signal analysis
    
    Features:
    - Candlestick charts with signal overlays
    - Signal correlation matrices
    - Individual signal analysis charts
    - Performance attribution charts
    - Interactive HTML and static PNG outputs
    """
    
    def __init__(self, output_dir: str = None):
        super().__init__()
        self.output_dir = output_dir or '/tmp/charts'
        
        # Ensure output directory exists
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir, exist_ok=True)
        
        # Chart styling
        self.setup_styling()
        
        # Color scheme for signals
        self.signal_colors = {
            'utilities_spy': '#1f77b4',
            'lumber_gold': '#ff7f0e', 
            'treasury_curve': '#2ca02c',
            'vix_defensive': '#d62728',
            'sp500_ma': '#9467bd'
        }
        
        # Signal names for display
        self.signal_names = {
            'utilities_spy': 'Utilities/SPY',
            'lumber_gold': 'Lumber/Gold',
            'treasury_curve': 'Treasury Curve',
            'vix_defensive': 'VIX Defensive',
            'sp500_ma': 'S&P 500 MA'
        }
    
    def setup_styling(self):
        """Setup chart styling"""
        # Matplotlib styling
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        # Matplotlib defaults
        plt.rcParams.update({
            'figure.figsize': (12, 8),
            'figure.dpi': 150,
            'font.size': 10,
            'axes.titlesize': 14,
            'axes.labelsize': 12,
            'legend.fontsize': 10,
            'xtick.labelsize': 9,
            'ytick.labelsize': 9
        })
    
    def create_main_chart(self, analysis_id: str, chart_data: Dict[str, Any], 
                         format: str = 'png') -> Optional[str]:
        """
        Create main price and signals chart
        
        Args:
            analysis_id: Analysis identifier
            chart_data: Chart data from strategy
            format: Output format (png, html)
            
        Returns:
            Chart file path or None if creation fails
        """
        try:
            self.logger.info(f"Creating main chart for analysis {analysis_id}")
            
            if not chart_data or 'dates' not in chart_data:
                self.logger.warning("Insufficient chart data for main chart")
                return None
            
            if format.lower() == 'html':
                return self._create_interactive_main_chart(analysis_id, chart_data)
            else:
                return self._create_static_main_chart(analysis_id, chart_data, format)
                
        except Exception as e:
            self.logger.error(f"Main chart creation failed: {str(e)}")
            return None
    
    def _create_interactive_main_chart(self, analysis_id: str, chart_data: Dict[str, Any]) -> str:
        """Create interactive main chart using Plotly"""
        
        # Prepare data
        dates = pd.to_datetime(chart_data['dates'])
        prices = chart_data['prices']
        signals = chart_data.get('signals', {})
        consensus = chart_data.get('consensus', [])
        
        # Create subplots
        fig = make_subplots(
            rows=3, cols=1,
            shared_xaxes=True,
            vertical_spacing=0.03,
            subplot_titles=('Price Chart with Signals', 'Individual Signals', 'Consensus Signals'),
            row_heights=[0.5, 0.3, 0.2]
        )
        
        # Main price chart
        fig.add_trace(
            go.Scatter(
                x=dates,
                y=prices,
                mode='lines',
                name='Price',
                line=dict(color='black', width=2)
            ),
            row=1, col=1
        )
        
        # Add signal markers on price chart
        self._add_signal_markers_to_plotly(fig, dates, prices, signals, row=1)
        
        # Individual signals subplot
        self._add_individual_signals_to_plotly(fig, dates, signals, row=2)
        
        # Consensus signals subplot
        self._add_consensus_signals_to_plotly(fig, dates, consensus, row=3)
        
        # Update layout
        fig.update_layout(
            title=f'Gayed Signals Analysis - {analysis_id}',
            height=800,
            showlegend=True,
            legend=dict(x=0, y=1, traceorder='normal'),
            xaxis3=dict(title='Date'),
            yaxis1=dict(title='Price'),
            yaxis2=dict(title='Signal Strength'),
            yaxis3=dict(title='Consensus')
        )
        
        # Save as HTML
        chart_path = os.path.join(self.output_dir, f"{analysis_id}_main.html")
        fig.write_html(chart_path)
        
        return chart_path
    
    def _create_static_main_chart(self, analysis_id: str, chart_data: Dict[str, Any], format: str) -> str:
        """Create static main chart using Matplotlib"""
        
        # Prepare data
        dates = pd.to_datetime(chart_data['dates'])
        prices = chart_data['prices']
        signals = chart_data.get('signals', {})
        
        # Create figure with subplots
        fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(14, 10), sharex=True)
        fig.suptitle(f'Gayed Signals Analysis - {analysis_id}', fontsize=16, fontweight='bold')
        
        # Main price chart
        ax1.plot(dates, prices, color='black', linewidth=2, label='Price')
        ax1.set_ylabel('Price', fontsize=12)
        ax1.set_title('Price Chart with Signal Overlays')
        ax1.grid(True, alpha=0.3)
        
        # Add signal markers
        self._add_signal_markers_to_matplotlib(ax1, dates, prices, signals)
        
        # Individual signals chart
        self._add_individual_signals_to_matplotlib(ax2, dates, signals)
        ax2.set_ylabel('Signal Value', fontsize=12)
        ax2.set_title('Individual Signal Values')
        ax2.grid(True, alpha=0.3)
        
        # Consensus chart
        consensus = chart_data.get('consensus', [])
        self._add_consensus_signals_to_matplotlib(ax3, dates, consensus)
        ax3.set_ylabel('Consensus', fontsize=12)
        ax3.set_xlabel('Date', fontsize=12)
        ax3.set_title('Consensus Signals')
        ax3.grid(True, alpha=0.3)
        
        # Format x-axis
        ax3.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
        ax3.xaxis.set_major_locator(mdates.MonthLocator(interval=1))
        plt.setp(ax3.xaxis.get_majorticklabels(), rotation=45)
        
        # Add legends
        ax1.legend(loc='upper left')
        ax2.legend(loc='upper left', bbox_to_anchor=(1, 1))
        
        plt.tight_layout()
        
        # Save chart
        chart_path = os.path.join(self.output_dir, f"{analysis_id}_main.{format}")
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return chart_path
    
    def _add_signal_markers_to_plotly(self, fig, dates, prices, signals, row):
        """Add signal markers to Plotly chart"""
        for signal_name, signal_data in signals.items():
            if not signal_data:
                continue
                
            # Extract signal points
            signal_dates = []
            signal_prices = []
            signal_types = []
            
            for i, signal_info in enumerate(signal_data):
                if i < len(dates) and i < len(prices):
                    signal_dates.append(dates[i])
                    signal_prices.append(prices[i])
                    signal_types.append(signal_info.get('signal', 'Neutral'))
            
            # Add Risk-Off markers
            risk_off_dates = [d for d, s in zip(signal_dates, signal_types) if s == 'Risk-Off']
            risk_off_prices = [p for p, s in zip(signal_prices, signal_types) if s == 'Risk-Off']
            
            if risk_off_dates:
                fig.add_trace(
                    go.Scatter(
                        x=risk_off_dates,
                        y=risk_off_prices,
                        mode='markers',
                        name=f'{self.signal_names.get(signal_name, signal_name)} Risk-Off',
                        marker=dict(
                            color=self.signal_colors.get(signal_name, 'red'),
                            symbol='triangle-down',
                            size=8
                        )
                    ),
                    row=row, col=1
                )
            
            # Add Risk-On markers
            risk_on_dates = [d for d, s in zip(signal_dates, signal_types) if s == 'Risk-On']
            risk_on_prices = [p for p, s in zip(signal_prices, signal_types) if s == 'Risk-On']
            
            if risk_on_dates:
                fig.add_trace(
                    go.Scatter(
                        x=risk_on_dates,
                        y=risk_on_prices,
                        mode='markers',
                        name=f'{self.signal_names.get(signal_name, signal_name)} Risk-On',
                        marker=dict(
                            color=self.signal_colors.get(signal_name, 'green'),
                            symbol='triangle-up',
                            size=8
                        )
                    ),
                    row=row, col=1
                )
    
    def _add_signal_markers_to_matplotlib(self, ax, dates, prices, signals):
        """Add signal markers to Matplotlib chart"""
        for signal_name, signal_data in signals.items():
            if not signal_data:
                continue
                
            color = self.signal_colors.get(signal_name, 'blue')
            
            # Extract signal points
            for i, signal_info in enumerate(signal_data):
                if i >= len(dates) or i >= len(prices):
                    break
                    
                signal_type = signal_info.get('signal', 'Neutral')
                
                if signal_type == 'Risk-Off':
                    ax.scatter(dates[i], prices[i], color=color, marker='v', s=50, alpha=0.7)
                elif signal_type == 'Risk-On':
                    ax.scatter(dates[i], prices[i], color=color, marker='^', s=50, alpha=0.7)
    
    def _add_individual_signals_to_plotly(self, fig, dates, signals, row):
        """Add individual signals to Plotly subplot"""
        for signal_name, signal_data in signals.items():
            if not signal_data:
                continue
                
            # Convert signal values to numeric
            signal_values = []
            for signal_info in signal_data:
                signal_type = signal_info.get('signal', 'Neutral')
                if signal_type == 'Risk-Off':
                    signal_values.append(1)
                elif signal_type == 'Risk-On':
                    signal_values.append(-1)
                else:
                    signal_values.append(0)
            
            # Pad or trim to match dates
            if len(signal_values) > len(dates):
                signal_values = signal_values[:len(dates)]
            elif len(signal_values) < len(dates):
                signal_values.extend([0] * (len(dates) - len(signal_values)))
            
            fig.add_trace(
                go.Scatter(
                    x=dates,
                    y=signal_values,
                    mode='lines+markers',
                    name=self.signal_names.get(signal_name, signal_name),
                    line=dict(color=self.signal_colors.get(signal_name, 'blue'), width=2)
                ),
                row=row, col=1
            )
    
    def _add_individual_signals_to_matplotlib(self, ax, dates, signals):
        """Add individual signals to Matplotlib subplot"""
        for signal_name, signal_data in signals.items():
            if not signal_data:
                continue
                
            # Convert signal values to numeric
            signal_values = []
            signal_dates = []
            
            for i, signal_info in enumerate(signal_data):
                if i >= len(dates):
                    break
                    
                signal_type = signal_info.get('signal', 'Neutral')
                if signal_type == 'Risk-Off':
                    signal_values.append(1)
                elif signal_type == 'Risk-On':
                    signal_values.append(-1)
                else:
                    signal_values.append(0)
                signal_dates.append(dates[i])
            
            color = self.signal_colors.get(signal_name, 'blue')
            ax.plot(signal_dates, signal_values, color=color, linewidth=2, 
                   marker='o', markersize=3, label=self.signal_names.get(signal_name, signal_name))
    
    def _add_consensus_signals_to_plotly(self, fig, dates, consensus, row):
        """Add consensus signals to Plotly subplot"""
        if not consensus:
            return
            
        consensus_values = []
        for cons in consensus:
            consensus_type = cons.get('consensus', 'Mixed')
            if consensus_type == 'Risk-Off':
                consensus_values.append(1)
            elif consensus_type == 'Risk-On':
                consensus_values.append(-1)
            else:
                consensus_values.append(0)
        
        # Pad or trim to match dates
        if len(consensus_values) > len(dates):
            consensus_values = consensus_values[:len(dates)]
        elif len(consensus_values) < len(dates):
            consensus_values.extend([0] * (len(dates) - len(consensus_values)))
        
        fig.add_trace(
            go.Scatter(
                x=dates,
                y=consensus_values,
                mode='lines+markers',
                name='Consensus',
                line=dict(color='purple', width=3),
                fill='tonexty'
            ),
            row=row, col=1
        )
    
    def _add_consensus_signals_to_matplotlib(self, ax, dates, consensus):
        """Add consensus signals to Matplotlib subplot"""
        if not consensus:
            return
            
        consensus_values = []
        consensus_dates = []
        
        for i, cons in enumerate(consensus):
            if i >= len(dates):
                break
                
            consensus_type = cons.get('consensus', 'Mixed')
            if consensus_type == 'Risk-Off':
                consensus_values.append(1)
            elif consensus_type == 'Risk-On':
                consensus_values.append(-1)
            else:
                consensus_values.append(0)
            consensus_dates.append(dates[i])
        
        ax.plot(consensus_dates, consensus_values, color='purple', linewidth=3, 
               marker='s', markersize=4, label='Consensus')
        ax.fill_between(consensus_dates, consensus_values, alpha=0.3, color='purple')
    
    def create_correlation_chart(self, analysis_id: str, 
                               correlations: Dict[str, float]) -> Optional[str]:
        """
        Create correlation matrix chart
        
        Args:
            analysis_id: Analysis identifier
            correlations: Correlation data
            
        Returns:
            Chart file path or None if creation fails
        """
        try:
            self.logger.info(f"Creating correlation chart for analysis {analysis_id}")
            
            if not correlations:
                self.logger.warning("No correlation data provided")
                return None
            
            # Prepare correlation matrix
            signal_names = list(correlations.keys())
            correlation_matrix = np.eye(len(signal_names))
            
            # Fill correlation matrix (assuming correlations are with price)
            for i, signal in enumerate(signal_names):
                correlation_matrix[i, -1] = correlations[signal]  # Correlation with last element (price proxy)
                correlation_matrix[-1, i] = correlations[signal]
            
            # Create heatmap
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Use signal display names
            display_names = [self.signal_names.get(name, name) for name in signal_names]
            
            # Create heatmap
            im = ax.imshow(correlation_matrix, cmap='RdBu_r', aspect='auto', vmin=-1, vmax=1)
            
            # Set ticks and labels
            ax.set_xticks(range(len(display_names)))
            ax.set_yticks(range(len(display_names)))
            ax.set_xticklabels(display_names, rotation=45, ha='right')
            ax.set_yticklabels(display_names)
            
            # Add correlation values to cells
            for i in range(len(display_names)):
                for j in range(len(display_names)):
                    text = ax.text(j, i, f'{correlation_matrix[i, j]:.2f}',
                                 ha="center", va="center", color="black", fontweight='bold')
            
            # Add colorbar
            cbar = plt.colorbar(im, ax=ax)
            cbar.set_label('Correlation Coefficient', rotation=270, labelpad=20)
            
            # Set title
            ax.set_title(f'Signal Correlation Matrix - {analysis_id}', fontsize=14, fontweight='bold')
            
            plt.tight_layout()
            
            # Save chart
            chart_path = os.path.join(self.output_dir, f"{analysis_id}_correlation.png")
            plt.savefig(chart_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            return chart_path
            
        except Exception as e:
            self.logger.error(f"Correlation chart creation failed: {str(e)}")
            return None
    
    def create_signal_chart(self, analysis_id: str, signal_name: str, 
                           chart_data: Dict[str, Any]) -> Optional[str]:
        """
        Create individual signal analysis chart
        
        Args:
            analysis_id: Analysis identifier
            signal_name: Name of the signal
            chart_data: Chart data
            
        Returns:
            Chart file path or None if creation fails
        """
        try:
            self.logger.info(f"Creating {signal_name} chart for analysis {analysis_id}")
            
            if signal_name not in chart_data.get('signals', {}):
                self.logger.warning(f"No data for signal {signal_name}")
                return None
            
            signal_data = chart_data['signals'][signal_name]
            dates = pd.to_datetime(chart_data['dates'])
            prices = chart_data['prices']
            
            # Create figure with subplots
            fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
            fig.suptitle(f'{self.signal_names.get(signal_name, signal_name)} Analysis - {analysis_id}', 
                        fontsize=16, fontweight='bold')
            
            # Price chart with signals
            ax1.plot(dates, prices, color='black', linewidth=2, label='Price')
            
            # Add signal markers
            signal_dates = []
            signal_values = []
            confidence_values = []
            
            for i, signal_info in enumerate(signal_data):
                if i >= len(dates):
                    break
                    
                signal_type = signal_info.get('signal', 'Neutral')
                confidence = signal_info.get('confidence', 0)
                
                signal_dates.append(dates[i])
                confidence_values.append(confidence)
                
                if signal_type == 'Risk-Off':
                    signal_values.append(1)
                    ax1.scatter(dates[i], prices[i], color='red', marker='v', s=50, alpha=0.7)
                elif signal_type == 'Risk-On':
                    signal_values.append(-1)
                    ax1.scatter(dates[i], prices[i], color='green', marker='^', s=50, alpha=0.7)
                else:
                    signal_values.append(0)
            
            ax1.set_ylabel('Price')
            ax1.set_title('Price with Signal Markers')
            ax1.legend()
            ax1.grid(True, alpha=0.3)
            
            # Signal values over time
            ax2.plot(signal_dates, signal_values, color=self.signal_colors.get(signal_name, 'blue'), 
                    linewidth=2, marker='o', markersize=4)
            ax2.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
            ax2.set_ylabel('Signal Value')
            ax2.set_title('Signal Values Over Time')
            ax2.set_ylim(-1.5, 1.5)
            ax2.grid(True, alpha=0.3)
            
            # Confidence levels
            ax3.plot(signal_dates, confidence_values, color='orange', linewidth=2, marker='o', markersize=3)
            ax3.fill_between(signal_dates, confidence_values, alpha=0.3, color='orange')
            ax3.set_ylabel('Confidence')
            ax3.set_xlabel('Date')
            ax3.set_title('Signal Confidence Over Time')
            ax3.set_ylim(0, 1)
            ax3.grid(True, alpha=0.3)
            
            # Format x-axis
            ax3.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
            ax3.xaxis.set_major_locator(mdates.MonthLocator(interval=1))
            plt.setp(ax3.xaxis.get_majorticklabels(), rotation=45)
            
            plt.tight_layout()
            
            # Save chart
            chart_path = os.path.join(self.output_dir, f"{analysis_id}_{signal_name}.png")
            plt.savefig(chart_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            return chart_path
            
        except Exception as e:
            self.logger.error(f"{signal_name} chart creation failed: {str(e)}")
            return None
    
    def create_performance_chart(self, analysis_id: str, 
                               performance_data: Dict[str, Any]) -> Optional[str]:
        """
        Create performance attribution chart
        
        Args:
            analysis_id: Analysis identifier
            performance_data: Performance data
            
        Returns:
            Chart file path or None if creation fails
        """
        try:
            self.logger.info(f"Creating performance chart for analysis {analysis_id}")
            
            signal_attribution = performance_data.get('signal_attribution', {})
            if not signal_attribution:
                return None
            
            # Extract data for plotting
            signals = list(signal_attribution.keys())
            returns = [signal_attribution[s]['return_contribution'] for s in signals]
            accuracies = [signal_attribution[s]['accuracy'] for s in signals]
            
            # Create figure with subplots
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
            fig.suptitle(f'Performance Attribution - {analysis_id}', fontsize=16, fontweight='bold')
            
            # Return contribution chart
            display_names = [self.signal_names.get(s, s) for s in signals]
            colors = [self.signal_colors.get(s, 'blue') for s in signals]
            
            bars1 = ax1.bar(display_names, returns, color=colors, alpha=0.7)
            ax1.set_ylabel('Return Contribution')
            ax1.set_title('Signal Return Contribution')
            ax1.tick_params(axis='x', rotation=45)
            ax1.grid(True, alpha=0.3)
            
            # Add value labels on bars
            for bar, value in zip(bars1, returns):
                height = bar.get_height()
                ax1.text(bar.get_x() + bar.get_width()/2., height,
                        f'{value:.3f}', ha='center', va='bottom')
            
            # Accuracy chart
            bars2 = ax2.bar(display_names, accuracies, color=colors, alpha=0.7)
            ax2.set_ylabel('Accuracy')
            ax2.set_title('Signal Prediction Accuracy')
            ax2.set_ylim(0, 1)
            ax2.tick_params(axis='x', rotation=45)
            ax2.grid(True, alpha=0.3)
            
            # Add value labels on bars
            for bar, value in zip(bars2, accuracies):
                height = bar.get_height()
                ax2.text(bar.get_x() + bar.get_width()/2., height,
                        f'{value:.2f}', ha='center', va='bottom')
            
            plt.tight_layout()
            
            # Save chart
            chart_path = os.path.join(self.output_dir, f"{analysis_id}_performance.png")
            plt.savefig(chart_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            return chart_path
            
        except Exception as e:
            self.logger.error(f"Performance chart creation failed: {str(e)}")
            return None
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { formatCurrency } from '../lib/utils';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface AssetLiabilityChartProps {
  assets: number;
  liabilities: number;
}

export default function AssetLiabilityChart({ assets, liabilities }: AssetLiabilityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const data: ChartData[] = [
    { label: 'Assets', value: assets, color: '#3b82f6' },
    { label: 'Liabilities', value: liabilities, color: '#ef4444' }
  ];

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 300 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.label))
      .padding(0.4);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([height, 0]);

    // Add Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .style('font-size', '10px');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${(d as number) / 1000}k`))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .style('font-size', '10px');

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('stroke', '#1e293b')
      .attr('stroke-opacity', 0.1)
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      );

    // Bars
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label) || 0)
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', d => d.color)
      .attr('rx', 4)
      .transition()
      .duration(1000)
      .attr('y', d => y(d.value))
      .attr('height', d => height - y(d.value));

    // Labels
    svg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.label) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(d => formatCurrency(d.value).split('.')[0]);

  }, [assets, liabilities]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      <div className="mt-2 text-[10px] text-slate-500 font-mono flex gap-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" /> Total Assets
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" /> Total Liabilities
        </div>
      </div>
    </div>
  );
}
